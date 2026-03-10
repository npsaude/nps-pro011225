// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  validarProcedimentoCbhpm,
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

  console.warn("[process-guia-honorarios] normalizeDate: formato de data desconhecido, descartando:", s);
  return null;
}

// Normaliza valor monetário para número
function normalizeMonetary(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  
  // Se já é número, retorna
  if (typeof value === "number") return value;
  
  const s = String(value).trim();
  if (!s) return null;
  
  // Remove R$, espaços e pontos de milhar, troca vírgula por ponto
  const cleaned = s
    .replace(/R\$\s*/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
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

  console.log("[process-guia-honorarios] Iniciando processamento...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    console.error("[process-guia-honorarios] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
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
    console.error("[process-guia-honorarios] Body JSON inválido.");
    return new Response(
      JSON.stringify({ error: "Body JSON inválido." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { userId, faturamentoId, files } = body;

  console.log("[process-guia-honorarios] userId:", userId);
  console.log("[process-guia-honorarios] faturamentoId:", faturamentoId);
  console.log("[process-guia-honorarios] files:", files?.length);

  if (!userId || !faturamentoId || !files || !Array.isArray(files) || files.length === 0) {
    console.error("[process-guia-honorarios] Parâmetros obrigatórios faltando.");
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
      "[process-guia-honorarios] Erro ao carregar app_settings:",
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
    console.error("[process-guia-honorarios] Token da OpenAI não configurado.");
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
        "[process-guia-honorarios] Erro ao criar URL assinada para arquivo:",
        path,
        error,
      );
      continue;
    }

    signedUrls.push(data.signedUrl);
  }

  if (signedUrls.length === 0) {
    console.error("[process-guia-honorarios] Não foi possível criar URLs assinadas.");
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

  console.log("[process-guia-honorarios] URLs assinadas criadas:", signedUrls.length);

  // Filtrar apenas imagens
  const imageUrls = signedUrls.filter((url) =>
    /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)
  );

  console.log("[process-guia-honorarios] URLs de imagens:", imageUrls.length);

  if (imageUrls.length === 0) {
    console.error("[process-guia-honorarios] Nenhuma imagem válida encontrada.");
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
  console.log("[process-guia-honorarios] Convertendo imagens para base64...");
  const imageBase64List = await imageUrlsToBase64(imageUrls);

  if (imageBase64List.length === 0) {
    console.error("[process-guia-honorarios] Falha ao converter imagens para base64.");
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

  console.log("[process-guia-honorarios] Imagens convertidas:", imageBase64List.length);

  // 3) Instruções de extração para Guia de Faturamento de Honorários
  const jsonFormatInstructions = `
Você é um assistente especializado em faturamento médico e guias de honorários.

A partir das IMAGENS anexadas (fotos de guias de faturamento de honorários médicos),
extraia todos os dados relevantes para preencher os campos de faturamento.

IMPORTANTE:
- As imagens podem ser de DIFERENTES PARTES da mesma guia de honorários.
- Analise TODAS as imagens e consolide as informações em um único JSON.
- Se um campo aparecer em múltiplas imagens, use o valor mais completo/legível.
- Use APENAS informações que aparecem claramente nos documentos.
- Se um campo não estiver presente ou não for possível inferir com segurança, use null nesse campo.
- Não invente dados.

Campos a extrair:

DADOS DO FATURAMENTO (tabela faturamentos):
- numero_guia_honorarios: Número da guia de honorários
- numero_guia_operadora: Número da guia da operadora (se diferente)
- operadora_nome: Nome da operadora/convênio
- nome_paciente: Nome completo do paciente
- hospital_solicitado: Nome do hospital
- data_cirurgia: Data da cirurgia/procedimento (formato DD/MM/YYYY ou YYYY-MM-DD)
- cid_codigo: Código CID do diagnóstico
- data_emissao: Data de emissão da guia (formato DD/MM/YYYY ou YYYY-MM-DD)
- data_inicio_faturamento: Data início do período de faturamento (formato DD/MM/YYYY ou YYYY-MM-DD)
- data_fim_faturamento: Data fim do período de faturamento (formato DD/MM/YYYY ou YYYY-MM-DD)
- valor_total_honorarios: Valor total dos honorários (número decimal, ex: 1500.00)
- status_autorizacao: Status da autorização (ex: "AUTORIZADO", "PENDENTE", "NEGADO")

PROCEDIMENTOS/ITENS (tabela itens_faturamento):
- procedimentos: Array de procedimentos faturados, cada um com:
  - codigo_procedimento: Código TUSS ou código do procedimento
  - descricao_procedimento: Descrição do procedimento
  - quantidade_autorizada: Quantidade autorizada (número)
  - quantidade_executada: Quantidade executada (número)
  - quantidade_faturada: Quantidade faturada (número)
  - valor_unitario: Valor unitário do procedimento (número decimal)
  - valor_total: Valor total do item (número decimal)

Responda APENAS com um JSON válido, sem comentários ou explicações extras, no formato abaixo:

{
  "faturamento": {
    "numero_guia_honorarios": string | null,
    "numero_guia_operadora": string | null,
    "operadora_nome": string | null,
    "nome_paciente": string | null,
    "hospital_solicitado": string | null,
    "data_cirurgia": string | null,
    "cid_codigo": string | null,
    "data_emissao": string | null,
    "data_inicio_faturamento": string | null,
    "data_fim_faturamento": string | null,
    "valor_total_honorarios": number | null,
    "status_autorizacao": string | null
  },
  "procedimentos": [
    {
      "codigo_procedimento": string | null,
      "descricao_procedimento": string | null,
      "quantidade_autorizada": number | null,
      "quantidade_executada": number | null,
      "quantidade_faturada": number | null,
      "valor_unitario": number | null,
      "valor_total": number | null
    }
  ] | null
}
`;

  // 4) Chamar OpenAI para analisar as imagens
  console.log("[process-guia-honorarios] Chamando OpenAI modelo:", openaiModel);

  let messageContent: string;
  let openaiUsage: any;

  try {
    const result = await openaiChatWithImages({
      apiKey: openaiToken,
      model: openaiModel,
      systemPrompt:
        "Você é um assistente de IA especializado em leitura de guias de faturamento de honorários médicos e faturamento hospitalar brasileiro. Extraia TODOS os dados visíveis com máxima precisão. Sempre responda com JSON válido e completo.",
      userText: jsonFormatInstructions,
      imageBase64List,
      maxTokens: 4096,
    });
    messageContent = result.content;
    openaiUsage = result.usage;
  } catch (openaiErr) {
    console.error("[process-guia-honorarios] Erro da OpenAI:", openaiErr);
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
    edgeFunction: "process-guia-honorarios",
    model: openaiModel,
    usage: openaiUsage,
  });

  if (!messageContent) {
    console.error("[process-guia-honorarios] Resposta da OpenAI sem conteúdo.");
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
      "[process-guia-honorarios] Falha ao fazer parse do JSON da OpenAI:",
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
    "[process-guia-honorarios] Resposta da OpenAI parseada:",
    JSON.stringify(parsed).slice(0, 2000),
  );

  const faturamentoData = parsed?.faturamento ?? {};
  const procedimentosData = parsed?.procedimentos ?? [];

  // 5) Atualizar o faturamento existente com os dados extraídos
  const filePaths = files.map((f) => f.path);

  const updateData: Record<string, unknown> = {
    url_guia_honorarios: filePaths,
    updated_at: new Date().toISOString(),
  };

  // Dados do faturamento
  if (faturamentoData.numero_guia_honorarios) {
    updateData.numero_guia_honorarios = faturamentoData.numero_guia_honorarios;
  }

  if (faturamentoData.numero_guia_operadora) {
    updateData.numero_autorizacao = faturamentoData.numero_guia_operadora;
  }

  if (faturamentoData.operadora_nome) {
    updateData.paciente_convenio = faturamentoData.operadora_nome;
  }

  if (faturamentoData.nome_paciente) {
    updateData.paciente_nome = faturamentoData.nome_paciente;
  }

  if (faturamentoData.hospital_solicitado) {
    updateData.hospital_nome = faturamentoData.hospital_solicitado;
  }

  const dataCirurgia = normalizeDate(faturamentoData.data_cirurgia);
  if (dataCirurgia) {
    updateData.data_cirurgia = dataCirurgia;
  }

  if (faturamentoData.cid_codigo) {
    updateData.diagnostico_cid = faturamentoData.cid_codigo;
  }

  const dataEmissao = normalizeDate(faturamentoData.data_emissao);
  if (dataEmissao) {
    updateData.data_emissao = dataEmissao;
  }

  const dataInicioFaturamento = normalizeDate(faturamentoData.data_inicio_faturamento);
  if (dataInicioFaturamento) {
    updateData.data_inicio_faturamento = dataInicioFaturamento;
  }

  const dataFimFaturamento = normalizeDate(faturamentoData.data_fim_faturamento);
  if (dataFimFaturamento) {
    updateData.data_fim_faturamento = dataFimFaturamento;
  }

  const valorTotalHonorarios = normalizeMonetary(faturamentoData.valor_total_honorarios);
  if (valorTotalHonorarios !== null) {
    updateData.valor_total_honorarios = valorTotalHonorarios;
    updateData.valor_total_faturado = valorTotalHonorarios;
  }

  console.log("[process-guia-honorarios] Atualizando faturamento:", faturamentoId);
  console.log("[process-guia-honorarios] Dados de atualização:", JSON.stringify(updateData));

  const { error: updateError } = await supabase
    .from("faturamentos")
    .update(updateData)
    .eq("id", faturamentoId);

  if (updateError) {
    console.error("[process-guia-honorarios] Erro ao atualizar faturamento:", updateError);
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

  // 6) Atualizar os itens de faturamento existentes ou inserir novos - COM VALIDAÇÃO CBHPM
  if (Array.isArray(procedimentosData) && procedimentosData.length > 0) {
    console.log("[process-guia-honorarios] Processando", procedimentosData.length, "procedimentos...");

    // Buscar o medico_id do faturamento
    const { data: faturamentoInfo, error: faturamentoError } = await supabase
      .from("faturamentos")
      .select("medico_id")
      .eq("id", faturamentoId)
      .single();

    const medicoId = faturamentoInfo?.medico_id ?? userId;

    for (const proc of procedimentosData) {
      const codigoOriginal = proc.codigo_procedimento?.toString().trim() || null;
      const descricaoOriginal = proc.descricao_procedimento?.toString().trim() || null;
      const quantidadeFaturada = proc.quantidade_faturada ?? proc.quantidade_executada ?? 1;
      const valorUnitario = normalizeMonetary(proc.valor_unitario) ?? 0;
      const valorTotal = normalizeMonetary(proc.valor_total) ?? (valorUnitario * quantidadeFaturada);

      // Validar contra CBHPM para obter código/descrição corretos
      const validacao = await validarProcedimentoCbhpm(
        supabase,
        codigoOriginal,
        descricaoOriginal,
        0.6 // limiar de similaridade 60%
      );

      if (!validacao.valido || !validacao.codigo_validado) {
        console.log(
          `[process-guia-honorarios] ❌ Procedimento rejeitado (não encontrado na CBHPM): codigo="${codigoOriginal}", descricao="${descricaoOriginal?.slice(0, 50)}..."`
        );
        continue;
      }

      const codigoProcedimento = validacao.codigo_validado;
      const descricaoProcedimento = validacao.descricao_validada;

      console.log(
        `[process-guia-honorarios] ✅ Procedimento validado (${validacao.metodo_validacao}): ${codigoProcedimento}`
      );

      // Tentar encontrar item existente pelo código do procedimento
      const { data: existingItem, error: findError } = await supabase
        .from("itens_faturamento")
        .select("id")
        .eq("faturamento_id", faturamentoId)
        .eq("codigo_procedimento", codigoProcedimento)
        .maybeSingle();

      if (existingItem) {
        // Atualizar item existente com dados de faturamento
        const { error: updateItemError } = await supabase
          .from("itens_faturamento")
          .update({
            quantidade_faturada: quantidadeFaturada,
            valor_unitario: valorUnitario,
            valor_total_item: valorTotal,
            valor_faturado: valorTotal,
            medico_id: medicoId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingItem.id);

        if (updateItemError) {
          console.error("[process-guia-honorarios] Erro ao atualizar item:", updateItemError);
        } else {
          console.log("[process-guia-honorarios] Item atualizado:", codigoProcedimento);
        }
      } else {
        // Inserir novo item
        const { error: insertError } = await supabase
          .from("itens_faturamento")
          .insert({
            faturamento_id: faturamentoId,
            medico_id: medicoId,
            codigo_procedimento: codigoProcedimento,
            descricao_procedimento: descricaoProcedimento,
            quantidade_autorizada: proc.quantidade_autorizada ?? quantidadeFaturada,
            quantidade_executada: proc.quantidade_executada ?? quantidadeFaturada,
            quantidade_faturada: quantidadeFaturada,
            quantidade: quantidadeFaturada,
            valor_unitario: valorUnitario,
            valor_total_item: valorTotal,
            valor_faturado: valorTotal,
            status_item: "pendente",
          });

        if (insertError) {
          console.error("[process-guia-honorarios] Erro ao inserir item:", insertError);
        } else {
          console.log("[process-guia-honorarios] Novo item inserido:", codigoProcedimento);
        }
      }
    }
  }

  console.log("[process-guia-honorarios] Processamento concluído com sucesso.");

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