// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logOpenAIUsage } from "../_shared/openai-usage-logger.ts";
import { imageUrlsToBase64 } from "../_shared/image-to-base64.ts";
import { openaiChatWithImages, extractJson } from "../_shared/openai-chat.ts";
import { getAuthenticatedUserId, resolveEffectiveUserId } from "../_shared/auth.ts";

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
    "[process-sadt-acompanhamento] normalizeDate: formato desconhecido, descartando:",
    s,
  );
  return null;
}

function normalizeTime(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  const m = s.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const [, hh, mm, ss] = m;
    return `${hh}:${mm}:${ss ?? "00"}`;
  }

  console.warn(
    "[process-sadt-acompanhamento] normalizeTime: formato desconhecido, descartando:",
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
  files: UploadedFile[];
}

serve(async (req) => {
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  console.log("[process-sadt-acompanhamento] Iniciando processamento...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "[process-sadt-acompanhamento] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.",
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
    console.error("[process-sadt-acompanhamento] Body JSON inválido.");
    return new Response(JSON.stringify({ error: "Body JSON inválido." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { files } = body;
  // Segurança (F-2): deriva o userId do JWT verificado em vez de confiar no body.
  const authUserId = await getAuthenticatedUserId(req);
  const userId = resolveEffectiveUserId(authUserId, body.userId ?? null, "process-sadt-acompanhamento");

  if (!userId || !files || !Array.isArray(files) || files.length === 0) {
    console.error(
      "[process-sadt-acompanhamento] Parâmetros obrigatórios faltando.",
    );
    return new Response(
      JSON.stringify({
        error: "Parâmetros obrigatórios: userId e files.",
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
      "[process-sadt-acompanhamento] Erro ao carregar app_settings:",
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
    console.error("[process-sadt-acompanhamento] Token da OpenAI não configurado.");
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
        "[process-sadt-acompanhamento] Erro ao criar URL assinada para arquivo:",
        path,
        error,
      );
      continue;
    }

    signedUrls.push(data.signedUrl);
  }

  if (signedUrls.length === 0) {
    console.error(
      "[process-sadt-acompanhamento] Não foi possível criar URLs assinadas.",
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
    console.error("[process-sadt-acompanhamento] Nenhuma imagem válida encontrada.");
    return new Response(
      JSON.stringify({
        error:
          "Nenhuma imagem válida encontrada. Envie imagens (PNG, JPEG, GIF, WEBP).",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log(
    "[process-sadt-acompanhamento] Convertendo imagens para base64...",
  );
  const imageBase64List = await imageUrlsToBase64(imageUrls);

  if (imageBase64List.length === 0) {
    console.error(
      "[process-sadt-acompanhamento] Falha ao converter imagens para base64.",
    );
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

  console.log(
    "[process-sadt-acompanhamento] Imagens convertidas:",
    imageBase64List.length,
  );

  // 3) Prompt e formato JSON
  const jsonFormatInstructions = `
Você é um assistente especializado em leitura de GUIAS SADT (TISS/ANS) — Guia de Serviço Profissional/Serviço Auxiliar de Diagnóstico e Terapia — e extração estruturada de dados.

A partir das IMAGENS anexadas (fotos da guia SADT), extraia os campos abaixo.

REGRAS:
- Analise TODAS as imagens e consolide em um único JSON.
- Use apenas informações claramente presentes.
- Se um campo não estiver presente ou não for confiável, use null.
- Responda APENAS com JSON válido (sem comentários, sem texto extra).

Retorne no formato:
{
  "guia": {
    "registro_ans": string | null,
    "numero_guia_prestador": string | null,
    "numero_guia_sadt": string | null,
    "senha": string | null,
    "numero_guia_operadora": string | null,

    "numero_carteira": string | null,
    "nome_beneficiario": string | null,
    "nome_social": string | null,
    "atendimento_rn": string | null,

    "solicitante_codigo_operadora": string | null,
    "solicitante_nome": string | null,
    "solicitante_cnes": string | null,

    "solicitante_profissional_nome": string | null,
    "solicitante_profissional_conselho_codigo": string | null,
    "solicitante_profissional_numero_conselho": string | null,
    "solicitante_profissional_uf": string | null,
    "solicitante_profissional_cbo": string | null,

    "executante_codigo_operadora": string | null,
    "executante_nome": string | null,
    "executante_cnes": string | null,

    "carater_atendimento": string | null,
    "data_solicitacao": string | null,
    "indicacao_clinica": string | null,
    "tipo_atendimento": string | null,
    "indicacao_acidente": string | null,
    "tipo_consulta": string | null,
    "motivo_encerramento": string | null,

    "data_autorizacao": string | null,
    "data_validade_senha": string | null,
    "data_inicio_atendimento": string | null,
    "data_fim_atendimento": string | null,
    "valor_total_procedimentos": number | string | null,
    "valor_total_taxas": number | string | null,
    "valor_total_materiais": number | string | null,
    "valor_total_medicamentos": number | string | null,
    "valor_total_geral": number | string | null,
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

  console.log(
    "[process-sadt-acompanhamento] Chamando OpenAI modelo:",
    openaiModel,
  );

  let messageContent: string;
  let openaiUsage: any;

  try {
    const result = await openaiChatWithImages({
      apiKey: openaiToken,
      model: openaiModel,
      systemPrompt:
        "Você é um assistente de IA especializado em leitura de guias TISS/ANS SADT brasileiras. Extraia TODOS os dados visíveis com máxima precisão. Sempre responda com JSON válido e completo.",
      userText: jsonFormatInstructions,
      imageBase64List,
      maxTokens: 4096,
    });
    messageContent = result.content;
    openaiUsage = result.usage;
  } catch (openaiErr) {
    console.error("[process-sadt-acompanhamento] Erro da OpenAI:", openaiErr);
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
    faturamentoId: null,
    edgeFunction: "process-sadt-acompanhamento",
    model: openaiModel,
    usage: openaiUsage,
  });

  if (!messageContent) {
    console.error("[process-sadt-acompanhamento] Resposta da OpenAI sem conteúdo.");
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
      "[process-sadt-acompanhamento] Falha ao fazer parse do JSON:",
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

  const guia = parsed?.guia ?? {};
  const itens = Array.isArray(parsed?.itens) ? parsed.itens : [];

  // 4) Buscar dados do médico logado para verificar pertencimento da guia
  const { data: medicoData } = await supabase
    .from("medicos")
    .select("nome, crm")
    .eq("id", userId)
    .maybeSingle();

  const medicoNome: string = (medicoData as any)?.nome ?? "";
  const medicoCrm: string = (medicoData as any)?.crm ?? "";

  // Campos da guia que identificam o profissional executante/solicitante
  const guiaProfNome: string = guia.profissional_nome ?? guia.solicitante_profissional_nome ?? "";
  const guiaProfConselho: string = guia.profissional_numero_conselho ?? guia.solicitante_profissional_numero_conselho ?? "";

  const forceInsert = (body as any).forceInsert === true;
  const forceOwnership = (body as any).forceOwnership === true;

  // Verificar se o médico participa da guia (por CRM ou nome)
  if (!forceOwnership && !forceInsert) {
    const normalizeStr = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const crmMatch =
      medicoCrm &&
      guiaProfConselho &&
      normalizeStr(medicoCrm).replace(/\D/g, "") === normalizeStr(guiaProfConselho).replace(/\D/g, "");

    const nomeMatch =
      medicoNome &&
      guiaProfNome &&
      normalizeStr(guiaProfNome).includes(normalizeStr(medicoNome).split(" ")[0]);

    const pertence = crmMatch || nomeMatch;

    if (!pertence && (guiaProfNome || guiaProfConselho)) {
      console.log("[process-sadt-acompanhamento] Guia não pertence ao médico. Médico:", medicoNome, medicoCrm, "| Guia profissional:", guiaProfNome, guiaProfConselho);
      return new Response(
        JSON.stringify({
          not_owner: true,
          profissional_nome_guia: guiaProfNome || null,
          profissional_conselho_guia: guiaProfConselho || null,
          nome_beneficiario: guia.nome_beneficiario ?? null,
          numero_guia_prestador: guia.numero_guia_prestador ?? null,
          message: `Esta guia pertence ao profissional "${guiaProfNome || guiaProfConselho}" e não ao médico logado.`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  // 5) Verificar duplicata pelo número da guia prestador
  const numeroGuiaPrestador = guia.numero_guia_prestador ?? null;

  if (numeroGuiaPrestador && !forceInsert) {
    const { data: existente } = await supabase
      .from("sadt_acompanhamento")
      .select("id, numero_guia_prestador, nome_beneficiario, data_inicio_atendimento, valor_total_geral, created_at")
      .eq("medico_id", userId)
      .eq("numero_guia_prestador", numeroGuiaPrestador)
      .maybeSingle();

    if (existente) {
      console.log("[process-sadt-acompanhamento] Duplicata detectada para guia:", numeroGuiaPrestador);
      return new Response(
        JSON.stringify({
          duplicate: true,
          numero_guia_prestador: numeroGuiaPrestador,
          nome_beneficiario: guia.nome_beneficiario ?? null,
          guia_existente: existente,
          message: `A guia ${numeroGuiaPrestador} já foi enviada anteriormente.`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  // 6) Inserir sadt_acompanhamento
  const filePaths = files.map((f) => f.path);

  const insertSadt: Record<string, unknown> = {
    medico_id: userId,

    registro_ans: guia.registro_ans ?? null,
    numero_guia_prestador: guia.numero_guia_prestador ?? null,
    numero_guia_sadt: guia.numero_guia_sadt ?? null,
    senha: guia.senha ?? null,
    numero_guia_operadora: guia.numero_guia_operadora ?? null,

    numero_carteira: guia.numero_carteira ?? null,
    nome_beneficiario: guia.nome_beneficiario ?? null,
    nome_social: guia.nome_social ?? null,
    atendimento_rn: guia.atendimento_rn ?? null,

    solicitante_codigo_operadora: guia.solicitante_codigo_operadora ?? null,
    solicitante_nome: guia.solicitante_nome ?? null,
    solicitante_cnes: guia.solicitante_cnes ?? null,

    solicitante_profissional_nome: guia.solicitante_profissional_nome ?? null,
    solicitante_profissional_conselho_codigo:
      guia.solicitante_profissional_conselho_codigo ?? null,
    solicitante_profissional_numero_conselho:
      guia.solicitante_profissional_numero_conselho ?? null,
    solicitante_profissional_uf: guia.solicitante_profissional_uf ?? null,
    solicitante_profissional_cbo: guia.solicitante_profissional_cbo ?? null,

    executante_codigo_operadora: guia.executante_codigo_operadora ?? null,
    executante_nome: guia.executante_nome ?? null,
    executante_cnes: guia.executante_cnes ?? null,

    carater_atendimento: guia.carater_atendimento ?? null,
    data_solicitacao: normalizeDate(guia.data_solicitacao),
    indicacao_clinica: guia.indicacao_clinica ?? null,
    tipo_atendimento: guia.tipo_atendimento ?? null,
    indicacao_acidente: guia.indicacao_acidente ?? null,
    tipo_consulta: guia.tipo_consulta ?? null,
    motivo_encerramento: guia.motivo_encerramento ?? null,

    data_autorizacao: normalizeDate(guia.data_autorizacao),
    data_validade_senha: normalizeDate(guia.data_validade_senha),
    data_inicio_atendimento: normalizeDate(guia.data_inicio_atendimento),
    data_fim_atendimento: normalizeDate(guia.data_fim_atendimento),
    valor_total_procedimentos: toNumberOrNull(guia.valor_total_procedimentos),
    valor_total_taxas: toNumberOrNull(guia.valor_total_taxas),
    valor_total_materiais: toNumberOrNull(guia.valor_total_materiais),
    valor_total_medicamentos: toNumberOrNull(guia.valor_total_medicamentos),
    // Fallback: se a IA não extraiu valor_total_geral, soma os subtotais disponíveis
    valor_total_geral: (() => {
      const geral = toNumberOrNull(guia.valor_total_geral);
      if (geral !== null) return geral;
      const proc = toNumberOrNull(guia.valor_total_procedimentos) ?? 0;
      const taxas = toNumberOrNull(guia.valor_total_taxas) ?? 0;
      const mat = toNumberOrNull(guia.valor_total_materiais) ?? 0;
      const med = toNumberOrNull(guia.valor_total_medicamentos) ?? 0;
      const soma = proc + taxas + mat + med;
      return soma > 0 ? soma : null;
    })(),
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

  console.log("[process-sadt-acompanhamento] Inserindo sadt_acompanhamento...");

  const { data: sadtCreated, error: sadtError } = await supabase
    .from("sadt_acompanhamento")
    .insert(insertSadt)
    .select("id")
    .single();

  if (sadtError || !sadtCreated?.id) {
    console.error(
      "[process-sadt-acompanhamento] Erro ao inserir sadt_acompanhamento:",
      sadtError,
    );
    return new Response(
      JSON.stringify({
        error: "Erro ao inserir sadt_acompanhamento no banco.",
        details: sadtError?.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const sadtId = sadtCreated.id;

  // 7) Inserir itens (se houver)
  if (Array.isArray(itens) && itens.length > 0) {
    const rows = itens.map((it: any) => ({
      sadt_id: sadtId,

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
      .from("itens_sadt_acompanhamento")
      .insert(rows);

    if (itensError) {
      console.error(
        "[process-sadt-acompanhamento] Erro ao inserir itens_sadt_acompanhamento:",
        itensError,
      );
    }

    // Fallback secundário: se valor_total_geral ainda for null, somar valor_total dos itens
    if (insertSadt.valor_total_geral === null && rows.length > 0) {
      const somaItens = rows.reduce((acc: number, r: any) => acc + (r.valor_total ?? 0), 0);
      if (somaItens > 0) {
        console.log("[process-sadt-acompanhamento] Aplicando fallback: valor_total_geral = soma dos itens:", somaItens);
        await supabase
          .from("sadt_acompanhamento")
          .update({ valor_total_geral: somaItens })
          .eq("id", sadtId);
      }
    }
  }

  console.log(
    "[process-sadt-acompanhamento] Processamento concluído com sucesso.",
  );

  return new Response(
    JSON.stringify({
      success: true,
      sadt_acompanhamento_id: sadtId,
      dados_extraidos: { guia, itens },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
