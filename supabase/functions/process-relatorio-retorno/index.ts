// @ts-nocheck
//
// Edge Function: process-relatorio-retorno
//
// Recebe um PDF de relatório de retorno (extrato de pagamento / analítico)
// enviado por um usuário, envia o PDF para a OpenAI (Files + Responses API),
// extrai cabeçalho + itens em JSON, valida se o médico do relatório é o
// próprio usuário que está importando e, em caso positivo, persiste em
// `relatorios_retorno` e `itens_relatorio_retorno`.
//
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logOpenAIUsage } from "../_shared/openai-usage-logger.ts";
import {
  extractJson,
  modelDisallowsTemperature,
  modelUsesMaxCompletionTokens,
} from "../_shared/openai-chat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface RequestBody {
  userId: string;
  filePath: string;        // path no bucket NPS-pro
  fileName?: string;
  // Nome do usuário/médico logado para validação. Se vazio, a function
  // tentará buscar em usuarios_sistema pelo userId/email.
  expectedMedicoNome?: string;
  expectedMedicoEmail?: string;
}

// ─── Helpers de normalização ──────────────────────────────────────────────────

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const mBR = s.match(
    /^(\d{2})\/(\d{2})\/(\d{2,4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (mBR) {
    let [, dd, mm, yyyy] = mBR;
    if (yyyy.length === 2) yyyy = "20" + yyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function normalizeMonetary(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return isNaN(value) ? null : value;

  const s = String(value).trim();
  if (!s) return null;

  // Remove R$, espaços e pontos de milhar, troca vírgula por ponto.
  const cleaned = s
    .replace(/R\$\s*/gi, "")
    .replace(/[^\d,.\-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // remove ponto separador de milhar
    .replace(",", ".")
    .trim();

  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizeNome(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, " ")
    .replace(/\b(dr|dra|dr\.|dra\.)\b/gi, "")
    .trim()
    .toLowerCase();
}

// Decide se os nomes "batem" — usa duas estratégias:
// 1) um contém o outro;
// 2) pelo menos 2 tokens em comum (>=3 letras).
function nomesBatemMedico(nomeRelatorio: string, nomeUsuario: string): boolean {
  const a = normalizeNome(nomeRelatorio);
  const b = normalizeNome(nomeUsuario);
  if (!a || !b) return false;

  if (a.includes(b) || b.includes(a)) return true;

  const tokensA = new Set(a.split(" ").filter((t) => t.length >= 3));
  const tokensB = b.split(" ").filter((t) => t.length >= 3);
  const comuns = tokensB.filter((t) => tokensA.has(t)).length;
  return comuns >= 2;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method.toUpperCase() === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  console.log("[process-relatorio-retorno] Iniciando processamento...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({
        error:
          "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: RequestBody;
  try {
    body = JSON.parse(await req.text()) as RequestBody;
  } catch (e) {
    console.error("[process-relatorio-retorno] Body JSON inválido:", e);
    return new Response(
      JSON.stringify({ error: "Body JSON inválido." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const {
    userId,
    filePath,
    fileName,
    expectedMedicoNome,
    expectedMedicoEmail,
  } = body;

  if (!userId || !filePath) {
    return new Response(
      JSON.stringify({
        error: "Parâmetros obrigatórios: userId, filePath.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 1) Resolver nome esperado do médico (do usuário logado)
  let nomeEsperado = (expectedMedicoNome ?? "").trim();
  if (!nomeEsperado) {
    // Tenta achar em usuarios_sistema via email
    if (expectedMedicoEmail) {
      const { data: u } = await supabase
        .from("usuarios_sistema")
        .select("nome")
        .eq("email", expectedMedicoEmail)
        .maybeSingle();
      nomeEsperado = (u?.nome ?? "").trim();
    }
  }

  console.log(
    "[process-relatorio-retorno] Nome do médico esperado:",
    nomeEsperado || "(não informado)",
  );

  // 2) Buscar token e modelo da OpenAI
  const { data: settings, error: settingsError } = await supabase
    .from("app_settings")
    .select("openai_api_token, openai_model")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    console.error("[process-relatorio-retorno] Erro app_settings:", settingsError);
    return new Response(
      JSON.stringify({ error: "Erro ao carregar configurações da aplicação." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const openaiToken =
    (settings as any)?.openai_api_token ?? (settings as any)?.openaiApiToken;
  const openaiModel =
    (settings as any)?.openai_model ?? (settings as any)?.openaiModel ?? "gpt-4o";

  if (!openaiToken) {
    return new Response(
      JSON.stringify({ error: "Token da OpenAI não configurado." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 3) Criar URL assinada do PDF
  const bucketName = "NPS-pro";
  const { data: signed, error: signedError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, 60 * 60);

  if (signedError || !signed?.signedUrl) {
    console.error("[process-relatorio-retorno] Erro signed URL:", signedError);
    return new Response(
      JSON.stringify({
        error: "Não foi possível criar URL assinada para o PDF.",
        details: signedError?.message,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 4) Baixar PDF e enviar para OpenAI Files API
  let fileId: string | null = null;
  try {
    const pdfResp = await fetch(signed.signedUrl);
    if (!pdfResp.ok) {
      const txt = await pdfResp.text();
      console.error("[process-relatorio-retorno] Falha download PDF:", txt);
      return new Response(
        JSON.stringify({ error: "Falha ao baixar o PDF do storage.", details: txt }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const pdfBuffer = await pdfResp.arrayBuffer();
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const formData = new FormData();
    formData.append("file", pdfBlob, fileName || "relatorio_retorno.pdf");
    formData.append("purpose", "assistants");

    const uploadResp = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiToken}` },
      body: formData,
    });

    if (!uploadResp.ok) {
      const errText = await uploadResp.text();
      console.error("[process-relatorio-retorno] Erro Files API:", errText);
      return new Response(
        JSON.stringify({
          error: "Não foi possível enviar o PDF para a OpenAI (Files API).",
          details: errText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const uploadJson = await uploadResp.json();
    fileId = uploadJson?.id ?? null;
    if (!fileId) {
      return new Response(
        JSON.stringify({
          error: "OpenAI Files API não retornou file_id.",
          details: JSON.stringify(uploadJson),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (e) {
    console.error("[process-relatorio-retorno] Erro upload OpenAI:", e);
    return new Response(
      JSON.stringify({
        error: "Erro inesperado ao enviar o PDF para a OpenAI.",
        details: e instanceof Error ? e.message : String(e),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 5) Prompt — extração estruturada robusta para múltiplos formatos
  const prompt = `
Você é um assistente especializado em RELATÓRIOS DE RETORNO / EXTRATOS DE PAGAMENTO de honorários médicos no Brasil.
Os relatórios podem vir de várias fontes (cada clínica/operadora tem seu próprio layout). Exemplos comuns:

- UNIMED (Extrato de Pagamento de Cooperado) — geralmente lista atendimentos por paciente, com colunas de valor apresentado, glosa, líquido, e totalizadores no rodapé.
- MAX CLINICAS (Extrato de Repasse) — agrupa por médico/competência, com data, procedimento, valor bruto, descontos e líquido.
- Relatório "Analítico" de clínica/hospital — agrupa por paciente/atendimento, lista os procedimentos do médico (cirurgião / 1º auxiliar / anestesista...), com valor base, glosa, desconto e líquido.

Sua tarefa: ler o PDF anexo e extrair os dados em um JSON único, identificando o formato e
adaptando a leitura. Use APENAS o que está visível. Se um campo não estiver presente, use null.
Não invente dados.

REGRAS GERAIS:
- Datas: use o formato "YYYY-MM-DD" ou copie a string do PDF se ambígua.
- Valores monetários: use número decimal com ponto (ex: 1234.56). Sem símbolo de moeda.
- Não invente itens. Se a linha do PDF não tiver código/descrição/valor claramente, ignore.
- Se houver várias linhas para o mesmo paciente/atendimento, gere um item por linha.
- "funcao_profissional" do item: copie o que indicar o papel do médico naquele procedimento
  (ex: "Cirurgião", "1º Auxiliar", "Anestesista", "Instrumentador"). Se não houver, deixe null.
- Para o cabeçalho:
   - "origem": nome curto do emissor (ex: "UNIMED", "MAXCLINICAS", "ANALITICO", ou o nome da clínica que aparece no topo).
   - "clinica_hospital": razão social / nome do hospital ou cooperativa que está pagando.
   - "medico_nome": nome completo do médico ao qual o relatório se refere (geralmente aparece no topo, ex: "Dr. Luiz Severo", "Jose Airton Case Neto").
   - "competencia": ex "OUT/2023" ou "Nov 25" (use o texto do PDF).
   - "data_pagamento": data de pagamento principal do relatório, se houver.
   - Totalizadores: copie os totais finais do relatório quando existirem.

FORMATO DE SAÍDA (JSON):

{
  "cabecalho": {
    "origem": string | null,
    "clinica_hospital": string | null,
    "medico_nome": string | null,
    "medico_crm": string | null,
    "medico_especialidade": string | null,
    "medico_funcao": string | null,
    "competencia": string | null,
    "data_pagamento": string | null,
    "periodo_inicio": string | null,
    "periodo_fim": string | null,
    "total_bruto": number | null,
    "total_glosa": number | null,
    "total_desconto": number | null,
    "total_imposto": number | null,
    "total_liquido": number | null
  },
  "itens": [
    {
      "paciente_nome": string | null,
      "paciente_carteira": string | null,
      "numero_guia": string | null,
      "numero_conta": string | null,
      "data_atendimento": string | null,
      "data_realizacao": string | null,
      "data_pagamento": string | null,
      "convenio": string | null,
      "plano": string | null,
      "hospital_local": string | null,
      "codigo_procedimento": string | null,
      "descricao_procedimento": string | null,
      "funcao_profissional": string | null,
      "quantidade": number | null,
      "valor_base": number | null,
      "valor_apresentado": number | null,
      "valor_glosa": number | null,
      "motivo_glosa": string | null,
      "valor_desconto": number | null,
      "valor_imposto": number | null,
      "valor_liquido": number | null,
      "observacoes": string | null
    }
  ]
}

RETORNE APENAS O JSON, sem markdown e sem comentários.
`;

  // 6) Chamar Responses API com input_file
  console.log("[process-relatorio-retorno] Chamando OpenAI Responses API...");
  let jsonText = "";
  let openaiUsage: any = null;

  const noTemperature = modelDisallowsTemperature(openaiModel);
  const useMaxCompletionTokens = modelUsesMaxCompletionTokens(openaiModel);
  console.log(
    `[process-relatorio-retorno] modelo=${openaiModel} | no_temperature=${noTemperature} | max_completion_tokens=${useMaxCompletionTokens}`,
  );

  const openaiBody: Record<string, unknown> = {
    model: openaiModel,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_file", file_id: fileId },
        ],
      },
    ],
  };
  if (!noTemperature) {
    openaiBody.temperature = 0;
  }
  // A Responses API usa max_output_tokens em vez de max_tokens.
  // Modelos novos (gpt-5 / o-series) também aceitam esse campo.
  openaiBody.max_output_tokens = 16384;

  try {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiToken}`,
      },
      body: JSON.stringify(openaiBody),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("[process-relatorio-retorno] Erro OpenAI Responses:", errText);
      return new Response(
        JSON.stringify({
          error: "Erro ao chamar a OpenAI para processar o relatório.",
          details: errText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const respJson = await resp.json();
    openaiUsage = respJson?.usage;

    // Extrai texto da resposta (Responses API)
    try {
      const out = respJson?.output ?? [];
      for (const item of out) {
        const contents = item?.content ?? [];
        for (const c of contents) {
          if (c?.type === "output_text" && typeof c.text === "string") {
            jsonText += c.text;
          } else if (
            c?.text && typeof c.text === "object" &&
            typeof c.text.value === "string"
          ) {
            jsonText += c.text.value;
          }
        }
      }
      if (!jsonText && typeof respJson?.output_text === "string") {
        jsonText = respJson.output_text;
      }
    } catch (e) {
      console.error("[process-relatorio-retorno] erro lendo resposta:", e);
    }
  } catch (e) {
    console.error("[process-relatorio-retorno] Erro inesperado OpenAI:", e);
    return new Response(
      JSON.stringify({
        error: "Erro inesperado ao chamar a OpenAI.",
        details: e instanceof Error ? e.message : String(e),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 7) Log de tokens
  await logOpenAIUsage({
    supabase,
    userId,
    faturamentoId: null,
    edgeFunction: "process-relatorio-retorno",
    model: openaiModel,
    usage: openaiUsage,
  });

  if (!jsonText) {
    return new Response(
      JSON.stringify({ error: "A OpenAI não retornou conteúdo." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 8) Parse JSON
  let parsed: any;
  try {
    parsed = extractJson(jsonText);
  } catch (e) {
    console.error("[process-relatorio-retorno] Falha parse JSON:", e, jsonText.slice(0, 500));
    return new Response(
      JSON.stringify({
        error: "Falha ao interpretar a resposta da OpenAI como JSON.",
        details: jsonText.slice(0, 1000),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const cab = parsed?.cabecalho ?? {};
  const itens: any[] = Array.isArray(parsed?.itens) ? parsed.itens : [];

  console.log(
    `[process-relatorio-retorno] Extraídos: medico="${cab?.medico_nome}", itens=${itens.length}`,
  );

  // 9) Validar médico do relatório vs usuário logado
  const medicoRelatorio = String(cab?.medico_nome ?? "").trim();

  if (nomeEsperado) {
    if (!medicoRelatorio) {
      return new Response(
        JSON.stringify({
          error:
            "Não foi possível identificar o médico no relatório. Importação cancelada.",
          medico_relatorio: null,
          medico_esperado: nomeEsperado,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!nomesBatemMedico(medicoRelatorio, nomeEsperado)) {
      console.warn(
        `[process-relatorio-retorno] Médico do relatório ("${medicoRelatorio}") não bate com o usuário logado ("${nomeEsperado}"). Importação rejeitada.`,
      );
      return new Response(
        JSON.stringify({
          error:
            "O médico identificado no relatório não corresponde ao usuário que está importando. Importação cancelada.",
          medico_relatorio: medicoRelatorio,
          medico_esperado: nomeEsperado,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } else {
    console.warn(
      "[process-relatorio-retorno] Nome esperado não fornecido — pulando validação de médico.",
    );
  }

  // 10) Inserir cabeçalho
  const relatorioInsert = {
    user_id: userId,
    arquivo_path: filePath,
    arquivo_nome: fileName ?? null,
    origem: cab.origem ?? null,
    clinica_hospital: cab.clinica_hospital ?? null,
    medico_nome: medicoRelatorio || null,
    medico_crm: cab.medico_crm ?? null,
    medico_especialidade: cab.medico_especialidade ?? null,
    medico_funcao: cab.medico_funcao ?? null,
    competencia: cab.competencia ?? null,
    data_pagamento: normalizeDate(cab.data_pagamento),
    periodo_inicio: normalizeDate(cab.periodo_inicio),
    periodo_fim: normalizeDate(cab.periodo_fim),
    total_bruto: normalizeMonetary(cab.total_bruto),
    total_glosa: normalizeMonetary(cab.total_glosa),
    total_desconto: normalizeMonetary(cab.total_desconto),
    total_imposto: normalizeMonetary(cab.total_imposto),
    total_liquido: normalizeMonetary(cab.total_liquido),
    raw_extracao: parsed,
  };

  const { data: relatorioRow, error: relErr } = await supabase
    .from("relatorios_retorno")
    .insert(relatorioInsert)
    .select("id")
    .single();

  if (relErr || !relatorioRow) {
    console.error("[process-relatorio-retorno] Erro insert cabeçalho:", relErr);
    return new Response(
      JSON.stringify({
        error: "Erro ao salvar cabeçalho do relatório.",
        details: relErr?.message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const relatorioId = relatorioRow.id;

  // 11) Inserir itens em lote
  let totalItens = 0;
  if (itens.length > 0) {
    const itensInsert = itens.map((it, idx) => ({
      relatorio_id: relatorioId,
      user_id: userId,
      paciente_nome: it.paciente_nome ?? null,
      paciente_carteira: it.paciente_carteira ?? null,
      numero_guia: it.numero_guia ?? null,
      numero_conta: it.numero_conta ?? null,
      data_atendimento: normalizeDate(it.data_atendimento),
      data_realizacao: normalizeDate(it.data_realizacao),
      data_pagamento: normalizeDate(it.data_pagamento),
      convenio: it.convenio ?? null,
      plano: it.plano ?? null,
      hospital_local: it.hospital_local ?? null,
      codigo_procedimento: it.codigo_procedimento ?? null,
      descricao_procedimento: it.descricao_procedimento ?? null,
      funcao_profissional: it.funcao_profissional ?? null,
      quantidade:
        it.quantidade === null || it.quantidade === undefined
          ? null
          : Number(it.quantidade),
      valor_base: normalizeMonetary(it.valor_base),
      valor_apresentado: normalizeMonetary(it.valor_apresentado),
      valor_glosa: normalizeMonetary(it.valor_glosa),
      motivo_glosa: it.motivo_glosa ?? null,
      valor_desconto: normalizeMonetary(it.valor_desconto),
      valor_imposto: normalizeMonetary(it.valor_imposto),
      valor_liquido: normalizeMonetary(it.valor_liquido),
      observacoes: it.observacoes ?? null,
      ordem: idx + 1,
    }));

    // Insere em chunks de 500 para evitar payload muito grande
    const CHUNK = 500;
    for (let i = 0; i < itensInsert.length; i += CHUNK) {
      const chunk = itensInsert.slice(i, i + CHUNK);
      const { error: itErr } = await supabase
        .from("itens_relatorio_retorno")
        .insert(chunk);
      if (itErr) {
        console.error("[process-relatorio-retorno] Erro insert itens:", itErr);
        return new Response(
          JSON.stringify({
            error: "Erro ao salvar itens do relatório.",
            details: itErr.message,
            relatorio_id: relatorioId,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      totalItens += chunk.length;
    }
  }

  console.log(
    `[process-relatorio-retorno] OK — relatorio_id=${relatorioId}, itens=${totalItens}`,
  );

  return new Response(
    JSON.stringify({
      success: true,
      relatorio_id: relatorioId,
      total_itens: totalItens,
      medico_relatorio: medicoRelatorio,
      medico_esperado: nomeEsperado || null,
      cabecalho: relatorioInsert,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
