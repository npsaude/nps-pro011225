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

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const match = s.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }

  console.warn(
    "[process-guia-solicitacao] normalizeDate: formato de data desconhecido, descartando:",
    s,
  );
  return null;
}

function normalizeTime(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  // HH:MM or HH:MM:SS
  const m = s.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [, hh, mm, ss] = m;
    return `${hh}:${mm}:${ss ?? "00"}`;
  }

  console.warn(
    "[process-guia-solicitacao] normalizeTime: formato de hora desconhecido, descartando:",
    s,
  );
  return null;
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.\-]/g, "")
    .trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
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

  if (method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  console.log("[process-guia-solicitacao] Iniciando processamento...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "[process-guia-solicitacao] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.",
    );
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
    body = (await req.json()) as RequestBody;
  } catch {
    console.error("[process-guia-solicitacao] Body JSON inválido.");
    return new Response(JSON.stringify({ error: "Body JSON inválido." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { userId, faturamentoId, files } = body;

  if (!userId || !faturamentoId || !Array.isArray(files) || files.length === 0) {
    console.error("[process-guia-solicitacao] Parâmetros obrigatórios faltando.");
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
    console.error(
      "[process-guia-solicitacao] Erro ao carregar app_settings:",
      settingsError,
    );
    return new Response(
      JSON.stringify({ error: "Erro ao carregar configurações da aplicação." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const openaiToken =
    (settings as any)?.openai_api_token ?? (settings as any)?.openaiApiToken;

  if (!openaiToken) {
    console.error("[process-guia-solicitacao] Token da OpenAI não configurado.");
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

  // 2) Criar URLs assinadas para os arquivos no bucket
  const bucketName = "NPS-pro";
  const signedUrls: string[] = [];

  for (const file of files) {
    const path = file?.path;
    if (!path) continue;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(path, 60 * 60);

    if (error || !data?.signedUrl) {
      console.error(
        "[process-guia-solicitacao] Erro ao criar URL assinada para arquivo:",
        path,
        error,
      );
      continue;
    }

    signedUrls.push(data.signedUrl);
  }

  if (signedUrls.length === 0) {
    console.error(
      "[process-guia-solicitacao] Não foi possível criar URLs assinadas.",
    );
    return new Response(
      JSON.stringify({
        error: "Não foi possível criar URLs assinadas para os arquivos enviados.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const imageUrls = signedUrls.filter((url) =>
    /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url),
  );

  if (imageUrls.length === 0) {
    console.error("[process-guia-solicitacao] Nenhuma imagem válida encontrada.");
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

  // 3) Prompt e formato JSON
  const jsonFormatInstructions = `
Você é um assistente especializado em leitura de GUIA DE SOLICITAÇÃO (TISS/ANS) e extração estruturada de dados.

A partir das IMAGENS anexadas (fotos da guia de solicitação), extraia os campos abaixo.

REGRAS:
- Analise TODAS as imagens e consolide em um único JSON.
- Use apenas informações claramente presentes.
- Se um campo não estiver presente ou não for confiável, use null.
- Responda APENAS com JSON válido (sem comentários, sem texto extra).

ATENÇÃO ESPECIAL PARA OS ITENS/PROCEDIMENTOS:
- Campo 23 (Qtde.) = quantidade
- Campo 24 (Via) = via_acesso
- Campo 25 (Tec.) = tecnica_utilizada
- Campo 26 (% Red./Acresc.) = percentual_reducao_acrescimo
- Campo 27 (Valor Unitário - R$) = valor_unitario
- Campo 28 (Valor Total - R$) = valor_total (IMPORTANTE: extrair este campo corretamente, é o valor total do item)

Retorne no formato:
{
  "guia": {
    "registro_ans": string | null,
    "numero_guia_prestador": string | null,
    "numero_guia_solicitacao": string | null,
    "senha": string | null,
    "numero_guia_operadora": string | null,
    "numero_carteira": string | null,
    "nome_beneficiario": string | null,
    "nome_social": string | null,
    "atendimento_rn": string | null,

    "contratado_codigo_operadora": string | null,
    "contratado_nome": string | null,
    "contratado_cnes": string | null,

    "executante_codigo_operadora": string | null,
    "executante_nome": string | null,
    "executante_cnes": string | null,

    "data_inicio_faturamento": string | null,
    "data_fim_faturamento": string | null,
    "valor_total_honorarios": number | string | null,
    "observacao": string | null,
    "data_emissao": string | null,

    "profissional_seq_ref": string | null,
    "profissional_grau_participacao": string | null,
    "profissional_cpf": string | null,
    "profissional_nome": string | null,
    "profissional_conselho_codigo": string | null,
    "profissional_numero_conselho": string | null,
    "profissional_uf": string | null,
    "profissional_cbo": string | null
  },
  "itens": [
    {
      "data_procedimento": string | null,
      "hora_inicial": string | null,
      "hora_final": string | null,

      "codigo_tabela": string | null,
      "codigo_procedimento": string | null,
      "descricao_procedimento": string | null,

      "quantidade": number | null,
      "via_acesso": string | null,
      "tecnica_utilizada": string | null,

      "percentual_reducao_acrescimo": number | string | null,
      "valor_unitario": number | string | null,
      "valor_total": number | string | null
    }
  ] | null
}
`;

  console.log("[process-guia-solicitacao] Chamando GPT-4o-mini para análise...");

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
              "Você é um assistente de IA especializado em leitura de guias TISS/ANS. Sempre responda com JSON válido.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: jsonFormatInstructions },
              ...imageUrls.map((url) => ({
                type: "image_url",
                image_url: { url, detail: "high" },
              })),
            ],
          },
        ],
      }),
    },
  );

  if (!openaiResponse.ok) {
    const errorText = await openaiResponse.text();
    console.error("[process-guia-solicitacao] Erro da OpenAI:", errorText);
    return new Response(
      JSON.stringify({ error: "Erro ao chamar a API da OpenAI.", details: errorText }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const completion = await openaiResponse.json();
  const messageContent = completion?.choices?.[0]?.message?.content;

  if (!messageContent) {
    console.error(
      "[process-guia-solicitacao] Resposta da OpenAI sem conteúdo:",
      completion,
    );
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
    parsed = JSON.parse(messageContent);
  } catch (e) {
    console.error(
      "[process-guia-solicitacao] Falha ao fazer parse do JSON:",
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

  const guia = parsed?.guia ?? {};
  const itens = Array.isArray(parsed?.itens) ? parsed.itens : [];

  // 4) Inserir guia_solicitacao
  const filePaths = files.map((f) => f.path);

  const insertGuia: Record<string, unknown> = {
    medico_id: userId,

    registro_ans: guia.registro_ans ?? null,
    numero_guia_prestador: guia.numero_guia_prestador ?? null,
    numero_guia_solicitacao: guia.numero_guia_solicitacao ?? null,
    senha: guia.senha ?? null,
    numero_guia_operadora: guia.numero_guia_operadora ?? null,
    numero_carteira: guia.numero_carteira ?? null,
    nome_beneficiario: guia.nome_beneficiario ?? null,
    nome_social: guia.nome_social ?? null,
    atendimento_rn: guia.atendimento_rn ?? null,

    contratado_codigo_operadora: guia.contratado_codigo_operadora ?? null,
    contratado_nome: guia.contratado_nome ?? null,
    contratado_cnes: guia.contratado_cnes ?? null,

    executante_codigo_operadora: guia.executante_codigo_operadora ?? null,
    executante_nome: guia.executante_nome ?? null,
    executante_cnes: guia.executante_cnes ?? null,

    data_inicio_faturamento: normalizeDate(guia.data_inicio_faturamento),
    data_fim_faturamento: normalizeDate(guia.data_fim_faturamento),
    valor_total_honorarios: toNumberOrNull(guia.valor_total_honorarios),
    observacao: guia.observacao ?? null,
    data_emissao: normalizeDate(guia.data_emissao),

    profissional_seq_ref: guia.profissional_seq_ref ?? null,
    profissional_grau_participacao: guia.profissional_grau_participacao ?? null,
    profissional_cpf: guia.profissional_cpf ?? null,
    profissional_nome: guia.profissional_nome ?? null,
    profissional_conselho_codigo: guia.profissional_conselho_codigo ?? null,
    profissional_numero_conselho: guia.profissional_numero_conselho ?? null,
    profissional_uf: guia.profissional_uf ?? null,
    profissional_cbo: guia.profissional_cbo ?? null,

    url_documentos: filePaths,
    updated_at: new Date().toISOString(),
  };

  console.log("[process-guia-solicitacao] Inserindo guia_solicitacao...");

  const { data: guiaCreated, error: guiaError } = await supabase
    .from("guia_solicitacao")
    .insert(insertGuia)
    .select("id")
    .single();

  if (guiaError || !guiaCreated?.id) {
    console.error(
      "[process-guia-solicitacao] Erro ao inserir guia_solicitacao:",
      guiaError,
    );
    return new Response(
      JSON.stringify({
        error: "Erro ao inserir guia_solicitacao no banco.",
        details: guiaError?.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const guiaId = guiaCreated.id;

  // 5) Vincular faturamento -> guia_solicitacao
  const { error: fatUpdateError } = await supabase
    .from("faturamentos")
    .update({
      guia_solicitacao_id: guiaId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", faturamentoId);

  if (fatUpdateError) {
    console.error(
      "[process-guia-solicitacao] Erro ao vincular faturamento à guia_solicitacao:",
      fatUpdateError,
    );
    // não aborta; guia e itens já foram inseridos
  }

  // 6) Inserir itens (se houver)
  if (Array.isArray(itens) && itens.length > 0) {
    const rows = itens.map((it: any) => ({
      guia_id: guiaId,

      data_procedimento: normalizeDate(it.data_procedimento),
      hora_inicial: normalizeTime(it.hora_inicial),
      hora_final: normalizeTime(it.hora_final),

      codigo_tabela: it.codigo_tabela ?? null,
      codigo_procedimento: it.codigo_procedimento ?? null,
      descricao_procedimento: it.descricao_procedimento ?? null,

      quantidade: typeof it.quantidade === "number" ? it.quantidade : null,
      via_acesso: it.via_acesso ?? null,
      tecnica_utilizada: it.tecnica_utilizada ?? null,

      percentual_reducao_acrescimo: toNumberOrNull(it.percentual_reducao_acrescimo),
      valor_unitario: toNumberOrNull(it.valor_unitario),
      valor_total: toNumberOrNull(it.valor_total),

      updated_at: new Date().toISOString(),
    }));

    const { error: itensError } = await supabase
      .from("itens_guia_solicitacao")
      .insert(rows);

    if (itensError) {
      console.error(
        "[process-guia-solicitacao] Erro ao inserir itens_guia_solicitacao:",
        itensError,
      );
    }
  }

  console.log("[process-guia-solicitacao] Processamento concluído com sucesso.");

  return new Response(
    JSON.stringify({
      success: true,
      faturamento_id: faturamentoId,
      guia_solicitacao_id: guiaId,
      dados_extraidos: { guia, itens },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});