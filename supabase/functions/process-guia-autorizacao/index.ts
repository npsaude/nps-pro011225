// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
        error: "Parâmetros obrigatórios: userId, faturamentoId e files (com ao menos 1 item).",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 1) Buscar token da OpenAI em app_settings
  const { data: settings, error: settingsError } = await supabase
    .from("app_settings")
    .select("openai_api_token")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    console.error("[process-guia-autorizacao] Erro ao carregar app_settings:", settingsError);
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

  // 3) Instruções de extração para Guia de Autorização
  const jsonFormatInstructions = `
Você é um assistente especializado em faturamento médico e guias de autorização de cirurgia.

A partir das IMAGENS anexadas (fotos de guias de autorização de cirurgia),
extraia todos os dados relevantes para preencher os campos de faturamento.

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
- cirurgiao_nome: Nome completo do médico cirurgião solicitante/executante
- cirurgiao_crm: CRM do médico cirurgião (apenas o número)
- status_autorizacao: Status da autorização (ex: "AUTORIZADO", "PENDENTE", "NEGADO")

ITENS/PROCEDIMENTOS (tabela itens_faturamento):
- procedimentos: Array de procedimentos autorizados, cada um com:
  - codigo_procedimento: Código TUSS ou código do procedimento
  - descricao_procedimento: Descrição do procedimento
  - quantidade_autorizada: Quantidade autorizada

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
    "status_autorizacao": string | null
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

  // 4) Chamar GPT-4 Vision para analisar as imagens
  console.log("[process-guia-autorizacao] Chamando GPT-4o-mini para análise de imagens...");

  const openaiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiToken}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente de IA especializado em leitura de guias de autorização médica (imagens) e faturamento. Sempre responda com JSON válido.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: jsonFormatInstructions,
              },
              ...imageUrls.map((url) => ({
                type: "image_url",
                image_url: {
                  url,
                  detail: "high",
                },
              })),
            ],
          },
        ],
      }),
    },
  );

  if (!openaiResponse.ok) {
    const errorText = await openaiResponse.text();
    console.error("[process-guia-autorizacao] Erro da OpenAI:", errorText);
    return new Response(
      JSON.stringify({
        error: "Erro ao chamar a API da OpenAI.",
        details: errorText,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const completion = await openaiResponse.json();
  const messageContent = completion?.choices?.[0]?.message?.content;

  if (!messageContent) {
    console.error("[process-guia-autorizacao] Resposta da OpenAI sem conteúdo:", completion);
    return new Response(
      JSON.stringify({
        error: "Resposta da OpenAI sem conteúdo utilizável.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(messageContent);
  } catch (e) {
    console.error(
      "[process-guia-autorizacao] Falha ao fazer parse do JSON da OpenAI:",
      e,
      messageContent,
    );
    return new Response(
      JSON.stringify({
        error: "Falha ao interpretar a resposta da OpenAI como JSON.",
      }),
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

  const updateData: Record<string, unknown> = {
    numero_autorizacao: faturamentoData.numero_guia_operadora ?? null,
    paciente_convenio: faturamentoData.operadora_nome ?? null,
    paciente_nome: faturamentoData.nome_paciente ?? null,
    paciente_carteirinha: faturamentoData.numero_carteira ?? null,
    hospital_nome: faturamentoData.hospital_solicitado ?? null,
    cirurgiao_principal_nome: faturamentoData.cirurgiao_nome ?? null,
    cirurgiao_principal_crm: faturamentoData.cirurgiao_crm ?? null,
    url_guia_autorizacao: filePaths,
    updated_at: new Date().toISOString(),
  };

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

  // 6) Inserir os itens de faturamento (procedimentos)
  if (Array.isArray(procedimentosData) && procedimentosData.length > 0) {
    console.log("[process-guia-autorizacao] Inserindo", procedimentosData.length, "procedimentos...");

    const itensRows = procedimentosData.map((proc: any) => ({
      faturamento_id: faturamentoId,
      codigo_procedimento: proc.codigo_procedimento ?? null,
      descricao_procedimento: proc.descricao_procedimento ?? null,
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
      console.log("[process-guia-autorizacao] Itens inseridos com sucesso.");
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
