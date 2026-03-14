// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  validarProcedimentoCbhpm,
  normalizeText,
} from "../_shared/cbhpm-validator.ts";
import { logOpenAIUsage } from "../_shared/openai-usage-logger.ts";
import { imageUrlsToBase64 } from "../_shared/image-to-base64.ts";
import { openaiChatWithImages, extractJson } from "../_shared/openai-chat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Helpers para normalizar datas vindas da OpenAI (formato brasileiro -> ISO/Postgres)
function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  // Já está em formato ISO (YYYY-MM-DD...)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }

  // Formato brasileiro: DD/MM/YYYY ou DD/MM/YYYY HH:MM[:SS]
  const match = s.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
  }

  console.warn("[process-guia-autorizacao] normalizeDate: formato de data desconhecido, descartando:", s);
  return null;
}

interface UploadedFile {
  path: string;
}

interface RequestBody {
  userId: string;
  faturamentoId: string;
  files: UploadedFile[];
}

serve(async (req) => {
  const method = req.method.toUpperCase();

  // Preflight CORS
  if (method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  console.log("[process-guia-autorizacao] Iniciando processamento...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    console.error("[process-guia-autorizacao] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
    return new Response(
      JSON.stringify({
        error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: RequestBody;
  try {
    const raw = await req.text();
    body = JSON.parse(raw) as RequestBody;
  } catch {
    console.error("[process-guia-autorizacao] Body JSON inválido.");
    return new Response(
      JSON.stringify({ error: "Body JSON inválido." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { userId, faturamentoId, files } = body;

  console.log("[process-guia-autorizacao] userId:", userId);
  console.log("[process-guia-autorizacao] faturamentoId:", faturamentoId);
  console.log("[process-guia-autorizacao] files:", files?.length);

  if (!userId || !faturamentoId || !files || !Array.isArray(files) || files.length === 0) {
    console.error("[process-guia-autorizacao] Parâmetros obrigatórios faltando.");
    return new Response(
      JSON.stringify({
        error: "Parâmetros obrigatórios: userId, faturamentoId e files.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 1) Buscar token e modelo da OpenAI em app_settings
  const { data: settings, error: settingsError } = await supabase
    .from("app_settings")
    .select("openai_api_token, openai_model")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    console.error(
      "[process-guia-autorizacao] Erro ao carregar app_settings:",
      settingsError,
    );
    return new Response(
      JSON.stringify({
        error: "Erro ao carregar configurações da aplicação.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const openaiToken =
    (settings as any)?.openai_api_token ?? (settings as any)?.openaiApiToken;
  const openaiModel =
    (settings as any)?.openai_model ?? (settings as any)?.openaiModel ?? "gpt-4o";

  if (!openaiToken) {
    console.error("[process-guia-autorizacao] Token da OpenAI não configurado.");
    return new Response(
      JSON.stringify({
        error:
          "Token da OpenAI não configurado em app_settings (campo openai_api_token).",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 2) Criar URLs assinadas para os arquivos no bucket NPS-pro
  const bucketName = "NPS-pro";
  const signedUrls: string[] = [];

  for (const file of files) {
    const path = file.path;
    if (!path) continue;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, 60 * 60); // 1 hora

    if (error || !data?.signedUrl) {
      console.error(
        "[process-guia-autorizacao] Erro ao criar URL assinada para arquivo:",
        path,
        error,
      );
      continue;
    }

    signedUrls.push(data.signedUrl);
  }

  if (signedUrls.length === 0) {
    console.error("[process-guia-autorizacao] Não foi possível criar URLs assinadas.");
    return new Response(
      JSON.stringify({
        error:
          "Não foi possível criar URLs assinadas para os arquivos enviados.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log("[process-guia-autorizacao] URLs assinadas criadas:", signedUrls.length);

  // Filtrar apenas imagens
  const imageUrls = signedUrls.filter((url) =>
    /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)
  );

  console.log("[process-guia-autorizacao] URLs de imagens:", imageUrls.length);

  if (imageUrls.length === 0) {
    console.error("[process-guia-autorizacao] Nenhuma imagem válida encontrada.");
    return new Response(
      JSON.stringify({
        error: "Nenhuma imagem válida encontrada. Envie imagens (PNG, JPEG, GIF, WEBP).",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Converter imagens para base64 (compatível com todos os modelos OpenAI)
  console.log("[process-guia-autorizacao] Convertendo imagens para base64...");
  const imageBase64List = await imageUrlsToBase64(imageUrls);

  if (imageBase64List.length === 0) {
    console.error("[process-guia-autorizacao] Falha ao converter imagens para base64.");
    return new Response(
      JSON.stringify({
        error: "Não foi possível processar as imagens enviadas.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log("[process-guia-autorizacao] Imagens convertidas:", imageBase64List.length);

  // 3) Instruções de extração para Guia de Autorização
  const jsonFormatInstructions = `
Você é um assistente especializado em faturamento médico e guias de autorização de cirurgia.

A partir das IMAGENS anexadas (fotos de guias de autorização de cirurgia),
extraia todos os dados relevantes para preencher os campos de faturamento.

REGRAS CRÍTICAS PARA EXTRAÇÃO DE PROCEDIMENTOS:
1. Extraia TODOS os procedimentos listados na seção "Procedimentos", "Procedimentos Solicitados", "Procedimentos Autorizados" ou qualquer tabela de procedimentos da guia.
2. NÃO duplique procedimentos - cada procedimento deve aparecer APENAS UMA VEZ no array.
3. Se o mesmo procedimento aparecer em múltiplas imagens, inclua-o apenas UMA vez.
4. NÃO invente ou infira procedimentos que não estejam claramente escritos na guia.
5. Verifique se cada código de procedimento é ÚNICO no array antes de incluí-lo.
6. Se houver dúvida se um item é um procedimento ou não, NÃO inclua.
7. Preste atenção ao número de linhas na tabela de procedimentos - extraia EXATAMENTE esse número de procedimentos, sem pular nenhuma linha.
8. Mesmo que a tabela tenha linhas em branco ou separadores, conte apenas as linhas com código preenchido.

REGRAS CRÍTICAS PARA EXTRAÇÃO DO CIRURGIÃO:
- O nome do cirurgião pode aparecer em campos com diferentes rótulos: "Cirurgião", "Médico Solicitante", "Profissional Solicitante", "Nome do Profissional", "Médico Executante", "Profissional Executante", "Médico Responsável" ou similares. Extraia o nome desse campo.
- O CRM do cirurgião deve conter APENAS OS DÍGITOS NUMÉRICOS. Remova qualquer prefixo ("CRM", "CRM/PE", "CRM-PE", etc.), barra, hífen, estado (UF) ou espaços. Exemplo: "CRM/PE 15126" → "15126", "015126 - PE" → "15126" (sem zeros à esquerda desnecessários), "CRM 12345-SP" → "12345".

IMPORTANTE:
- As imagens podem ser de DIFERENTES PARTES da mesma guia de autorização.
- Analise TODAS as imagens e consolide as informações em um único JSON.
- Se um campo aparecer em múltiplas imagens, use o valor mais completo/legível.
- Use APENAS informações que aparecem claramente nos documentos.
- Se um campo não estiver presente ou não for possível inferir com segurança, use null nesse campo.
- Não invente dados.

Campos a extrair:

FATURAMENTO (tabela faturamentos):
- numero_guia_operadora: Número da guia da operadora/convênio
- data_autorizacao: Data da autorização (formato DD/MM/YYYY ou YYYY-MM-DD)
- operadora_nome: Nome da operadora/convênio (ex: Unimed, Bradesco Saúde, etc.)
- nome_paciente: Nome completo do paciente
- numero_carteira: Número da carteira/carteirinha do paciente
- hospital_solicitado: Nome do hospital onde será realizado o procedimento
- cirurgiao_nome: Nome completo do médico cirurgião/profissional solicitante/executante (veja regras acima)
- cirurgiao_crm: CRM do médico cirurgião — retorne SOMENTE OS DÍGITOS NUMÉRICOS, sem letras, UF, barras ou hífens (veja regras acima)
- status_autorizacao: Status da autorização (ex: "AUTORIZADO", "PENDENTE", "NEGADO")
- carater_cirurgia: Caráter/tipo da cirurgia. Procure por campos como "Caráter da Internação", "Tipo de Atendimento", "Caráter do Atendimento" ou similares. Retorne EXATAMENTE "ELETIVA" se for eletiva/agendada/programada, ou "EMERGENCIAL" se for emergencial/urgência/urgente. Se não encontrar, retorne null.

ITENS/PROCEDIMENTOS (tabela itens_faturamento):
- procedimentos: Array com TODOS os procedimentos autorizados encontrados na guia. ATENÇÃO: Cada procedimento deve ser ÚNICO (sem duplicatas). Não pule nenhum procedimento listado.
  - codigo_procedimento: Código TUSS ou código do procedimento (DEVE SER ÚNICO no array)
  - descricao_procedimento: Descrição do procedimento
  - quantidade_autorizada: Quantidade autorizada (geralmente 1)

Responda APENAS com um JSON válido, sem comentários ou explicações extras, no formato abaixo:

{
  "faturamento": {
    "numero_guia_operadora": string | null,
    "data_autorizacao": string | null,
    "operadora_nome": string | null,
    "nome_paciente": string | null,
    "numero_carteira": string | null,
    "hospital_solicitado": string | null,
    "cirurgiao_nome": string | null,
    "cirurgiao_crm": string | null,
    "status_autorizacao": string | null,
    "carater_cirurgia": "ELETIVA" | "EMERGENCIAL" | null
  },
  "procedimentos": [
    {
      "codigo_procedimento": string | null,
      "descricao_procedimento": string | null,
      "quantidade_autorizada": number | null
    }
  ] | null
}
`;

  // 4) Chamar OpenAI para analisar as imagens
  console.log("[process-guia-autorizacao] Chamando OpenAI modelo:", openaiModel);

  let messageContent: string;
  let openaiUsage: any;

  try {
    const result = await openaiChatWithImages({
      apiKey: openaiToken,
      model: openaiModel,
      systemPrompt:
        "Você é um assistente de IA especializado em leitura de guias de autorização médica (imagens) e faturamento hospitalar brasileiro. Extraia TODOS os dados visíveis com máxima precisão. Sempre responda com JSON válido e completo.",
      userText: jsonFormatInstructions,
      imageBase64List,
      maxTokens: 4096,
    });
    messageContent = result.content;
    openaiUsage = result.usage;
  } catch (openaiErr) {
    console.error("[process-guia-autorizacao] Erro da OpenAI:", openaiErr);
    return new Response(
      JSON.stringify({
        error: "Erro ao chamar a API da OpenAI.",
        details: String(openaiErr),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Registrar uso de tokens
  await logOpenAIUsage({
    supabase,
    userId,
    faturamentoId,
    edgeFunction: "process-guia-autorizacao",
    model: openaiModel,
    usage: openaiUsage,
  });

  if (!messageContent) {
    console.error("[process-guia-autorizacao] Resposta da OpenAI sem conteúdo.");
    return new Response(
      JSON.stringify({ error: "Resposta da OpenAI sem conteúdo utilizável." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let parsed: any;
  try {
    parsed = extractJson(messageContent);
  } catch (e) {
    console.error(
      "[process-guia-autorizacao] Falha ao fazer parse do JSON da OpenAI:",
      e,
      messageContent,
    );
    return new Response(
      JSON.stringify({ error: "Falha ao interpretar a resposta da OpenAI como JSON." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log(
    "[process-guia-autorizacao] Resposta da OpenAI parseada:",
    JSON.stringify(parsed).slice(0, 2000),
  );

  const faturamentoData = parsed?.faturamento ?? {};
  const procedimentosData = parsed?.procedimentos ?? [];

  // 5) Atualizar o faturamento existente com os dados extraídos
  const filePaths = files.map((f) => f.path);

  // Sanitiza CRM: mantém apenas dígitos numéricos
  const rawCrm: string | null = faturamentoData.cirurgiao_crm ?? null;
  const sanitizedCrm = rawCrm ? rawCrm.replace(/\D/g, "") || null : null;
  console.log("[process-guia-autorizacao] CRM bruto:", rawCrm, "→ sanitizado:", sanitizedCrm);

  const updateData: Record<string, unknown> = {
    numero_autorizacao: faturamentoData.numero_guia_operadora ?? null,
    paciente_convenio: faturamentoData.operadora_nome ?? null,
    paciente_nome: faturamentoData.nome_paciente ?? null,
    paciente_carteirinha: faturamentoData.numero_carteira ?? null,
    hospital_nome: faturamentoData.hospital_solicitado ?? null,
    cirurgiao_principal_nome: faturamentoData.cirurgiao_nome ?? null,
    cirurgiao_principal_crm: sanitizedCrm,
    url_guia_autorizacao: filePaths,
    updated_at: new Date().toISOString(),
  };

  // Caráter da cirurgia (ELETIVA ou EMERGENCIAL)
  if (faturamentoData.carater_cirurgia === "ELETIVA" || faturamentoData.carater_cirurgia === "EMERGENCIAL") {
    updateData.carater_cirurgia = faturamentoData.carater_cirurgia;
  }

  // Se tiver data de autorização, adiciona
  const dataAutorizacao = normalizeDate(faturamentoData.data_autorizacao);
  if (dataAutorizacao) {
    updateData.data_atendimento = dataAutorizacao;
  }

  console.log("[process-guia-autorizacao] Atualizando faturamento:", faturamentoId);
  console.log("[process-guia-autorizacao] Dados de atualização:", JSON.stringify(updateData));

  const { error: updateError } = await supabase
    .from("faturamentos")
    .update(updateData)
    .eq("id", faturamentoId);

  if (updateError) {
    console.error("[process-guia-autorizacao] Erro ao atualizar faturamento:", updateError);
    return new Response(
      JSON.stringify({
        error: "Erro ao atualizar o faturamento no banco.",
        details: updateError.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 6) Inserir os itens de faturamento (procedimentos) - COM VALIDAÇÃO CBHPM
  if (Array.isArray(procedimentosData) && procedimentosData.length > 0) {
    console.log("[process-guia-autorizacao] Processando", procedimentosData.length, "procedimentos da IA...");

    // Deduplicar e validar procedimentos contra CBHPM
    const codigosJaAdicionados = new Set<string>();
    const procedimentosValidados: any[] = [];

    for (const proc of procedimentosData) {
      const codigoOriginal = proc.codigo_procedimento?.toString().trim() || null;
      const descricaoOriginal = proc.descricao_procedimento?.toString().trim() || null;

      // Validar contra CBHPM
      const validacao = await validarProcedimentoCbhpm(
        supabase,
        codigoOriginal,
        descricaoOriginal,
        0.6 // limiar de similaridade 60%
      );

      if (validacao.valido && validacao.codigo_validado) {
        // Evitar duplicatas
        if (codigosJaAdicionados.has(validacao.codigo_validado)) {
          console.log("[process-guia-autorizacao] Procedimento duplicado ignorado:", validacao.codigo_validado);
          continue;
        }

        codigosJaAdicionados.add(validacao.codigo_validado);

        procedimentosValidados.push({
          codigo_procedimento: validacao.codigo_validado,
          descricao_procedimento: validacao.descricao_validada,
          quantidade_autorizada: proc.quantidade_autorizada ?? 1,
          metodo_validacao: validacao.metodo_validacao,
        });

        console.log(
          `[process-guia-autorizacao] ✅ Procedimento validado (${validacao.metodo_validacao}): ${validacao.codigo_validado}`
        );
      } else {
        console.log(
          `[process-guia-autorizacao] ❌ Procedimento rejeitado (não encontrado na CBHPM): codigo="${codigoOriginal}", descricao="${descricaoOriginal?.slice(0, 50)}..."`
        );
      }
    }

    console.log("[process-guia-autorizacao] Procedimentos validados:", procedimentosValidados.length, "de", procedimentosData.length);

    if (procedimentosValidados.length > 0) {
      const itensRows = procedimentosValidados.map((proc: any) => ({
        faturamento_id: faturamentoId,
        codigo_procedimento: proc.codigo_procedimento,
        descricao_procedimento: proc.descricao_procedimento,
        quantidade: proc.quantidade_autorizada ?? 1,
        quantidade_autorizada: proc.quantidade_autorizada ?? 1,
        status_item: "pendente",
      }));

      const { error: itensError } = await supabase
        .from("itens_faturamento")
        .insert(itensRows);

      if (itensError) {
        console.error("[process-guia-autorizacao] Erro ao inserir itens_faturamento:", itensError);
        // Não bloqueia o fluxo, apenas loga o erro
      } else {
        console.log("[process-guia-autorizacao] Itens inseridos com sucesso:", procedimentosValidados.length);
      }
    }
  }

  console.log("[process-guia-autorizacao] Processamento concluído com sucesso.");

  return new Response(
    JSON.stringify({
      success: true,
      faturamento_id: faturamentoId,
      dados_extraidos: {
        faturamento: faturamentoData,
        procedimentos: procedimentosData,
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});