// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  validarProcedimentoCbhpm,
  normalizeText as normalizeTextCbhpm,
} from "../_shared/cbhpm-validator.ts";
import { logOpenAIUsage } from "../_shared/openai-usage-logger.ts";

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

  console.warn("[process-descricao-cirurgica] normalizeDate: formato de data desconhecido, descartando:", s);
  return null;
}

// Normaliza hora para formato HH:MM:SS
function normalizeTime(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  // Formato HH:MM ou HH:MM:SS
  const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const [, hh, mm, ss] = match;
    const hours = hh.padStart(2, "0");
    const minutes = mm.padStart(2, "0");
    const seconds = ss ? ss.padStart(2, "0") : "00";
    return `${hours}:${minutes}:${seconds}`;
  }

  console.warn("[process-descricao-cirurgica] normalizeTime: formato de hora desconhecido, descartando:", s);
  return null;
}

// Normaliza CPF para apenas dígitos (idealmente 11). Retorna null se vazio.
function normalizeCpf(value: unknown): string | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  // Se vier com mais/menos dígitos (ruído), ainda salvamos o que foi extraído.
  // Preferimos salvar apenas se tiver tamanho típico.
  if (digits.length === 11) return digits;
  return null;
}

function normalizeGuideNumber(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  // Mantém dígitos e letras (alguns guias podem ter letras), remove espaços internos.
  return s.replace(/\s+/g, "");
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

  console.log("[process-descricao-cirurgica] Iniciando processamento...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    console.error("[process-descricao-cirurgica] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
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
    console.error("[process-descricao-cirurgica] Body JSON inválido.");
    return new Response(
      JSON.stringify({ error: "Body JSON inválido." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { userId, faturamentoId, files } = body;

  console.log("[process-descricao-cirurgica] userId:", userId);
  console.log("[process-descricao-cirurgica] faturamentoId:", faturamentoId);
  console.log("[process-descricao-cirurgica] files:", files?.length);

  if (!userId || !faturamentoId || !files || !Array.isArray(files) || files.length === 0) {
    console.error("[process-descricao-cirurgica] Parâmetros obrigatórios faltando.");
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
    .select("openai_api_token, openai_model")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    console.error("[process-descricao-cirurgica] Erro ao carregar app_settings:", settingsError);
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
    console.error("[process-descricao-cirurgica] Token da OpenAI não configurado.");
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
        "[process-descricao-cirurgica] Erro ao criar URL assinada para arquivo:",
        path,
        error,
      );
      continue;
    }

    signedUrls.push(data.signedUrl);
  }

  if (signedUrls.length === 0) {
    console.error("[process-descricao-cirurgica] Não foi possível criar URLs assinadas.");
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

  console.log("[process-descricao-cirurgica] URLs assinadas criadas:", signedUrls.length);

  // Filtrar apenas imagens
  const imageUrls = signedUrls.filter((url) =>
    /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)
  );

  console.log("[process-descricao-cirurgica] URLs de imagens:", imageUrls.length);

  if (imageUrls.length === 0) {
    console.error("[process-descricao-cirurgica] Nenhuma imagem válida encontrada.");
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

  // 3) Instruções de extração para Descrição Cirúrgica
  const jsonFormatInstructions = `
Você é um especialista em faturamento médico hospitalar brasileiro. Analise TODAS as imagens fornecidas e extraia os dados com MÁXIMA PRECISÃO.

═══════════════════════════════════════════════════════
REGRAS ABSOLUTAS — VIOLAÇÃO DESTAS REGRAS É INACEITÁVEL
═══════════════════════════════════════════════════════
1. Leia TODAS as imagens completamente, de cima para baixo, antes de responder.
2. PROCEDIMENTOS: Conte cada linha da tabela "PROCEDIMENTOS REALIZADOS" ou "PROCEDIMENTOS CIRÚRGICOS". Se a tabela tem 5 linhas com procedimentos, o array deve ter 5 objetos. NUNCA omita nenhum.
3. NUNCA truncar ou resumir o array de procedimentos. Retorne TODOS.
4. Use APENAS dados visíveis. Não invente. Se não encontrar, use null.
5. Se um dado aparecer em múltiplas imagens, use o valor mais completo.

═══════════════════════════════════════════════════════
DADOS DA EXECUÇÃO (campo "faturamento")
═══════════════════════════════════════════════════════
- paciente_nome: Nome completo do paciente (campo "Registro Civil", "Paciente" ou "Nome")
- data_cirurgia: Data inicial do procedimento (formato DD/MM/YYYY)
- hora_inicio: Hora de início do procedimento (formato HH:MM)
- hora_fim: Hora de término do procedimento (formato HH:MM)
- paciente_cpf: CPF do paciente (apenas 11 dígitos numéricos, sem pontos ou traços)
- numero_guia_honorarios: Número da guia de honorários (se houver)
- numero_guia_internacao: Número da guia de internação / registro (se houver)

DIAGNÓSTICO:
- cid_codigo: Código CID (ex: "M75.1")
- diagnostico_descricao: Diagnóstico pós-operatório ou pré-operatório

═══════════════════════════════════════════════════════
EQUIPE CIRÚRGICA — ATENÇÃO ESPECIAL AOS CAMPOS ABAIXO
═══════════════════════════════════════════════════════
Procure a seção "EQUIPE PRESENTE NO ATO OPERATÓRIO" ou "EQUIPE CIRÚRGICA".

CIRURGIÃO:
- cirurgiao_nome: Nome do CIRURGIÃO (linha com rótulo "CIRURGIÃO" ou "CIRURGIAO")
- cirurgiao_crm: CRM do cirurgião (número após "CRM" na linha do cirurgião)

1º AUXILIAR:
- auxiliar1_nome: Nome do 1º AUXILIAR (linha com rótulo "1º AUXILIAR" ou "1 AUXILIAR")
- auxiliar1_crm: CRM do 1º auxiliar

2º AUXILIAR:
- auxiliar2_nome: Nome do 2º AUXILIAR
- auxiliar2_crm: CRM do 2º auxiliar

3º AUXILIAR:
- auxiliar3_nome: Nome do 3º AUXILIAR
- auxiliar3_crm: CRM do 3º auxiliar

INSTRUMENTADOR — ATENÇÃO: Este campo usa COREN, não CRM:
- instrumentador_nome: Nome do INSTRUMENTADOR (linha com rótulo "INSTRUMENTADOR" ou "INSTRUMENTADOR COREN")
  EXEMPLO: Se a linha mostrar "INSTRUMENTADOR | LIDIANE ROCHA", extraia "LIDIANE ROCHA"
- instrumentador_crm: Número do COREN do instrumentador (número após "COREN" ou "CONS. REG. ENFERMAGEM")
  EXEMPLO: Se mostrar "COREN - CONS. REG. ENFERMAGEM | 25444", extraia "25444"

ANESTESISTA — ATENÇÃO: Este campo pode usar CRM ou número de conselho diferente:
- anestesista_nome: Nome do ANESTESISTA (linha com rótulo "ANESTESISTA" ou "ANESTESISTA CRM")
  EXEMPLO: Se a linha mostrar "ANESTESISTA | MIRELLA TAVARES", extraia "MIRELLA TAVARES"
- anestesista_crm: Número do CRM ou conselho do anestesista
  EXEMPLO: Se mostrar "CRM - CONS. REG. MEDICINA | 18007", extraia "18007"

VALIDAÇÃO:
- assinatura_medica: true se há assinatura do médico visível, false caso contrário
- data_assinatura: Data da assinatura (DD/MM/YYYY)

═══════════════════════════════════════════════════════
PROCEDIMENTOS CIRÚRGICOS — REGRA CRÍTICA
═══════════════════════════════════════════════════════
Localize a tabela "PROCEDIMENTOS REALIZADOS" ou "PROCEDIMENTOS CIRÚRGICOS".

PASSO A PASSO OBRIGATÓRIO:
1. Identifique o cabeçalho da tabela (ex: "Tipo | Código | Procedimento | Quantidade")
2. Leia CADA LINHA de dados abaixo do cabeçalho
3. Para CADA linha com código numérico ou nome de procedimento, crie um objeto no array
4. Continue até a ÚLTIMA linha da tabela — não pare antes

Para cada procedimento extraia:
- codigo_procedimento: código numérico exatamente como aparece (ex: "30718058", "30731127")
- descricao_procedimento: descrição completa do procedimento (ex: "FRATURA (INCLUINDO DESCOLAMENTO EPIFISARIO) - TRATAMENTO CIRURGICO")
- quantidade_executada: número da coluna "Quantidade" (use 1 se não informado)

EXEMPLO de tabela com 5 procedimentos → array deve ter 5 objetos:
  Linha 1: 30718058 - FRATURA... → objeto 1
  Linha 2: 30731127 - TENOPLASTIA... → objeto 2
  Linha 3: 30717167 - TRANSFERENCIAS... → objeto 3
  Linha 4: 30718090 - PSEUDARTROSES... → objeto 4
  Linha 5: 31403239 - MICRONEUROLISE... → objeto 5

═══════════════════════════════════════════════════════
FORMATO DE RESPOSTA — JSON VÁLIDO E COMPLETO
═══════════════════════════════════════════════════════
Responda SOMENTE com JSON válido, sem texto adicional, sem markdown:

{
  "faturamento": {
    "paciente_nome": string | null,
    "data_cirurgia": string | null,
    "hora_inicio": string | null,
    "hora_fim": string | null,
    "paciente_cpf": string | null,
    "numero_guia_honorarios": string | null,
    "numero_guia_internacao": string | null,
    "cid_codigo": string | null,
    "diagnostico_descricao": string | null,
    "cirurgiao_nome": string | null,
    "cirurgiao_crm": string | null,
    "auxiliar1_nome": string | null,
    "auxiliar1_crm": string | null,
    "auxiliar2_nome": string | null,
    "auxiliar2_crm": string | null,
    "auxiliar3_nome": string | null,
    "auxiliar3_crm": string | null,
    "anestesista_nome": string | null,
    "anestesista_crm": string | null,
    "instrumentador_nome": string | null,
    "instrumentador_crm": string | null,
    "assinatura_medica": boolean | null,
    "data_assinatura": string | null
  },
  "procedimentos": [
    {
      "codigo_procedimento": string | null,
      "descricao_procedimento": string | null,
      "quantidade_executada": number | null
    }
  ]
}
`;

  // 4) Chamar GPT-4o para analisar as imagens (modelo completo para máxima precisão)
  console.log("[process-descricao-cirurgica] Chamando GPT-4o para análise de imagens...");

  const openaiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiToken}`,
      },
      body: JSON.stringify({
        model: openaiModel,
        temperature: 0,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você é um assistente de IA especializado em leitura de descrições cirúrgicas (imagens) e faturamento médico hospitalar brasileiro. " +
              "Sua principal responsabilidade é extrair TODOS os procedimentos cirúrgicos listados no documento, sem omitir nenhum. " +
              "Sempre responda com JSON válido e completo.",
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
    console.error("[process-descricao-cirurgica] Erro da OpenAI:", errorText);
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

  // Registrar uso de tokens da OpenAI
  await logOpenAIUsage({
    supabase,
    userId,
    faturamentoId,
    edgeFunction: "process-descricao-cirurgica",
    model: openaiModel,
    usage: completion?.usage,
  });

  if (!messageContent) {
    console.error("[process-descricao-cirurgica] Resposta da OpenAI sem conteúdo:", completion);
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
      "[process-descricao-cirurgica] Falha ao fazer parse do JSON da OpenAI:",
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
    "[process-descricao-cirurgica] Resposta da OpenAI parseada:",
    JSON.stringify(parsed).slice(0, 2000),
  );

  const faturamentoData = parsed?.faturamento ?? {};
  const procedimentosData = Array.isArray(parsed?.procedimentos) ? parsed.procedimentos : [];

  console.log(
    "[process-descricao-cirurgica] Procedimentos extraídos pela IA:",
    procedimentosData.length,
    "| Lista:",
    JSON.stringify(procedimentosData.map((p: any) => ({ cod: p.codigo_procedimento, desc: p.descricao_procedimento?.slice(0, 40) })))
  );

  // 5) Atualizar o faturamento existente com os dados extraídos
  const filePaths = files.map((f) => f.path);

  const updateData: Record<string, unknown> = {
    url_descricao_cirurgica: filePaths,
    updated_at: new Date().toISOString(),
  };

  // Dados da execução
  if (faturamentoData.paciente_nome) {
    updateData.paciente_nome = faturamentoData.paciente_nome;
  }

  const dataCirurgia = normalizeDate(faturamentoData.data_cirurgia);
  if (dataCirurgia) {
    updateData.data_cirurgia = dataCirurgia;
  }

  const horaInicio = normalizeTime(faturamentoData.hora_inicio);
  if (horaInicio) {
    updateData.hora_inicio = horaInicio;
  }

  const horaFim = normalizeTime(faturamentoData.hora_fim);
  if (horaFim) {
    updateData.hora_fim = horaFim;
  }

  const pacienteCpf = normalizeCpf(faturamentoData.paciente_cpf);
  if (pacienteCpf) {
    updateData.paciente_cpf = pacienteCpf;
  }

  const numeroGuiaHonorarios = normalizeGuideNumber(
    faturamentoData.numero_guia_honorarios,
  );
  if (numeroGuiaHonorarios) {
    updateData.numero_guia_honorarios = numeroGuiaHonorarios;
  }

  const numeroGuiaInternacao = normalizeGuideNumber(
    faturamentoData.numero_guia_internacao,
  );
  if (numeroGuiaInternacao) {
    updateData.numero_guia_internacao = numeroGuiaInternacao;
  }

  // Diagnóstico
  if (faturamentoData.cid_codigo) {
    updateData.diagnostico_cid = faturamentoData.cid_codigo;
  }

  if (faturamentoData.diagnostico_descricao) {
    updateData.diagnostico_descricao = faturamentoData.diagnostico_descricao;
  }

  // Equipe Cirúrgica - Cirurgião Principal
  if (faturamentoData.cirurgiao_nome) {
    updateData.cirurgiao_principal_nome = faturamentoData.cirurgiao_nome;
  }
  if (faturamentoData.cirurgiao_crm) {
    updateData.cirurgiao_principal_crm = faturamentoData.cirurgiao_crm;
  }

  // Equipe Cirúrgica - 1º Auxiliar
  if (faturamentoData.auxiliar1_nome) {
    updateData.auxiliar1_nome = faturamentoData.auxiliar1_nome;
  }
  if (faturamentoData.auxiliar1_crm) {
    updateData.auxiliar1_crm = faturamentoData.auxiliar1_crm;
  }

  // Equipe Cirúrgica - 2º Auxiliar
  if (faturamentoData.auxiliar2_nome) {
    updateData.auxiliar2_nome = faturamentoData.auxiliar2_nome;
  }
  if (faturamentoData.auxiliar2_crm) {
    updateData.auxiliar2_crm = faturamentoData.auxiliar2_crm;
  }

  // Equipe Cirúrgica - 3º Auxiliar
  if (faturamentoData.auxiliar3_nome) {
    updateData.auxiliar3_nome = faturamentoData.auxiliar3_nome;
  }
  if (faturamentoData.auxiliar3_crm) {
    updateData.auxiliar3_crm = faturamentoData.auxiliar3_crm;
  }

  // Equipe Cirúrgica - Anestesista
  if (faturamentoData.anestesista_nome) {
    updateData.anestesista_nome = faturamentoData.anestesista_nome;
  }
  if (faturamentoData.anestesista_crm) {
    updateData.anestesista_crm = faturamentoData.anestesista_crm;
  }

  // Instrumentador
  if (faturamentoData.instrumentador_nome) {
    updateData.instrumentador_nome = faturamentoData.instrumentador_nome;
  }
  if (faturamentoData.instrumentador_crm) {
    updateData.instrumentador_crm = faturamentoData.instrumentador_crm;
  }

  // Validação/Assinatura
  if (faturamentoData.assinatura_medica !== null && faturamentoData.assinatura_medica !== undefined) {
    updateData.assinatura_medica = Boolean(faturamentoData.assinatura_medica);
  }

  const dataAssinatura = normalizeDate(faturamentoData.data_assinatura);
  if (dataAssinatura) {
    updateData.data_assinatura = dataAssinatura;
  }

  console.log("[process-descricao-cirurgica] Atualizando faturamento:", faturamentoId);
  console.log("[process-descricao-cirurgica] Dados de atualização:", JSON.stringify(updateData));

  const { error: updateError } = await supabase
    .from("faturamentos")
    .update(updateData)
    .eq("id", faturamentoId);

  if (updateError) {
    console.error("[process-descricao-cirurgica] Erro ao atualizar faturamento:", updateError);
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

  // 5.1) Reconhecer atuação do médico logado e salvar em atuou_como
  try {
    // Buscar nome e CRM do médico logado (id_user = auth.uid)
    const { data: usuarioData, error: usuarioError } = await supabase
      .from("usuarios_sistema")
      .select("nome, crm")
      .eq("id_user", userId)
      .maybeSingle();

    if (usuarioError) {
      console.error("[process-descricao-cirurgica] Erro ao buscar usuario_sistema:", usuarioError);
    }

    const userNome = usuarioData?.nome ?? "";
    const userCrm = usuarioData?.crm ? String(usuarioData.crm) : "";

    console.log("[process-descricao-cirurgica] Dados do médico logado - nome:", userNome, "crm:", userCrm, "userId:", userId);

    if (userNome || userCrm) {
      // Dados da equipe extraídos pela IA
      const cirurgiaoNome = faturamentoData.cirurgiao_nome ?? null;
      const cirurgiaoCrm = faturamentoData.cirurgiao_crm ?? null;
      const auxiliar1Nome = faturamentoData.auxiliar1_nome ?? null;
      const auxiliar1Crm = faturamentoData.auxiliar1_crm ?? null;
      const auxiliar2Nome = faturamentoData.auxiliar2_nome ?? null;
      const auxiliar2Crm = faturamentoData.auxiliar2_crm ?? null;
      const auxiliar3Nome = faturamentoData.auxiliar3_nome ?? null;
      const auxiliar3Crm = faturamentoData.auxiliar3_crm ?? null;
      const anestesistaNome = faturamentoData.anestesista_nome ?? null;
      const anestesistaCrm = faturamentoData.anestesista_crm ?? null;
      const instrumentadorNome = faturamentoData.instrumentador_nome ?? null;
      const instrumentadorCrm = faturamentoData.instrumentador_crm ?? null;

      console.log("[process-descricao-cirurgica] Equipe extraída pela IA:", JSON.stringify({
        cirurgiao: { nome: cirurgiaoNome, crm: cirurgiaoCrm },
        aux1: { nome: auxiliar1Nome, crm: auxiliar1Crm },
        aux2: { nome: auxiliar2Nome, crm: auxiliar2Crm },
        aux3: { nome: auxiliar3Nome, crm: auxiliar3Crm },
        anestesista: { nome: anestesistaNome, crm: anestesistaCrm },
        instrumentador: { nome: instrumentadorNome, crm: instrumentadorCrm },
      }));

      // Funções auxiliares de normalização (inline)
      const normalizeDigits = (s: string) => String(s ?? "").replace(/\D/g, "");
      const normalizeTextLocal = (s: string) =>
        String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
      const cleanToken = (s: string) => normalizeTextLocal(s).replace(/[^a-z0-9]/g, "");
      const firstNameFn = (input: string): string => {
        const parts = normalizeTextLocal(input).split(" ").filter(Boolean);
        if (parts.length === 0) return "";
        const first = cleanToken(parts[0]);
        if (["dr", "dra", "doutor", "doutora"].includes(first)) return cleanToken(parts[1] ?? "");
        return first;
      };
      // Compare last names as well for better matching
      const lastNameFn = (input: string): string => {
        const parts = normalizeTextLocal(input).split(" ").filter(Boolean);
        if (parts.length <= 1) return "";
        return cleanToken(parts[parts.length - 1]);
      };

      type Atuacao = "CIRURGIAO" | "PRIMEIRO_AUXILIAR" | "SEGUNDO_AUXILIAR" | "TERCEIRO_AUXILIAR" | "ANESTESISTA";

      const candidates: Array<{ atuacao: Atuacao; nome: string | null; crm: string | null }> = [
        { atuacao: "CIRURGIAO", nome: cirurgiaoNome, crm: cirurgiaoCrm },
        { atuacao: "PRIMEIRO_AUXILIAR", nome: auxiliar1Nome, crm: auxiliar1Crm },
        { atuacao: "SEGUNDO_AUXILIAR", nome: auxiliar2Nome, crm: auxiliar2Crm },
        { atuacao: "TERCEIRO_AUXILIAR", nome: auxiliar3Nome, crm: auxiliar3Crm },
        { atuacao: "ANESTESISTA", nome: anestesistaNome, crm: anestesistaCrm },
      ];

      const crmUser = normalizeDigits(userCrm);
      let atuacaoReconhecida: Atuacao | null = null;

      // 1) Match por CRM (comparar apenas dígitos)
      if (crmUser) {
        console.log("[process-descricao-cirurgica] Tentando match por CRM. CRM do usuário (dígitos):", crmUser);
        for (const c of candidates) {
          const crmCandidate = normalizeDigits(c.crm ?? "");
          console.log(`[process-descricao-cirurgica]   Comparando com ${c.atuacao}: crm="${c.crm}" -> dígitos="${crmCandidate}"`);
          // Match if CRM digits are equal, OR if one contains the other (handles state suffix like "15126 - PE" vs "15126")
          if (crmCandidate && (crmCandidate === crmUser || crmCandidate.includes(crmUser) || crmUser.includes(crmCandidate))) {
            atuacaoReconhecida = c.atuacao;
            console.log(`[process-descricao-cirurgica]   ✅ Match por CRM! ${c.atuacao}`);
            break;
          }
        }
      }

      // 2) Fallback: match por primeiro nome
      if (!atuacaoReconhecida && userNome) {
        const userFirst = firstNameFn(userNome);
        const userLast = lastNameFn(userNome);
        console.log("[process-descricao-cirurgica] Tentando match por nome. Primeiro nome:", userFirst, "Último nome:", userLast);
        if (userFirst) {
          for (const c of candidates) {
            if (!c.nome) continue;
            const nomeFirst = firstNameFn(c.nome);
            const nomeLast = lastNameFn(c.nome);
            console.log(`[process-descricao-cirurgica]   Comparando com ${c.atuacao}: nome="${c.nome}" -> primeiro="${nomeFirst}", último="${nomeLast}"`);
            // Match by first name
            if (nomeFirst && nomeFirst === userFirst) {
              atuacaoReconhecida = c.atuacao;
              console.log(`[process-descricao-cirurgica]   ✅ Match por primeiro nome! ${c.atuacao}`);
              break;
            }
            // Match by last name (if first name didn't match)
            if (userLast && nomeLast && nomeLast === userLast) {
              atuacaoReconhecida = c.atuacao;
              console.log(`[process-descricao-cirurgica]   ✅ Match por último nome! ${c.atuacao}`);
              break;
            }
          }
        }
      }

      // 3) Fallback: match por qualquer parte do nome (substring)
      if (!atuacaoReconhecida && userNome) {
        const userNomeNorm = normalizeTextLocal(userNome);
        console.log("[process-descricao-cirurgica] Tentando match por substring do nome:", userNomeNorm);
        for (const c of candidates) {
          if (!c.nome) continue;
          const candidateNomeNorm = normalizeTextLocal(c.nome);
          // Check if user name contains candidate name or vice versa
          if (candidateNomeNorm && (candidateNomeNorm.includes(userNomeNorm) || userNomeNorm.includes(candidateNomeNorm))) {
            atuacaoReconhecida = c.atuacao;
            console.log(`[process-descricao-cirurgica]   ✅ Match por substring! ${c.atuacao} ("${candidateNomeNorm}" <-> "${userNomeNorm}")`);
            break;
          }
          // Check if any word from user name (>= 4 chars) appears in candidate name
          const userWords = userNomeNorm.split(" ").filter(w => w.length >= 4);
          for (const word of userWords) {
            if (candidateNomeNorm.includes(word)) {
              atuacaoReconhecida = c.atuacao;
              console.log(`[process-descricao-cirurgica]   ✅ Match por palavra "${word}"! ${c.atuacao}`);
              break;
            }
          }
          if (atuacaoReconhecida) break;
        }
      }

      if (atuacaoReconhecida) {
        console.log("[process-descricao-cirurgica] Atuação reconhecida:", atuacaoReconhecida, "para userId:", userId);
        const { error: atuacaoError } = await supabase
          .from("faturamentos")
          .update({
            atuou_como: atuacaoReconhecida,
            updated_at: new Date().toISOString(),
          })
          .eq("id", faturamentoId);

        if (atuacaoError) {
          console.error("[process-descricao-cirurgica] Erro ao salvar atuou_como:", atuacaoError);
        } else {
          console.log("[process-descricao-cirurgica] atuou_como salvo com sucesso:", atuacaoReconhecida);
        }
      } else {
        console.log("[process-descricao-cirurgica] ❌ Atuação NÃO reconhecida para userId:", userId, "crm:", userCrm, "nome:", userNome);
        console.log("[process-descricao-cirurgica] Candidatos avaliados:", JSON.stringify(candidates.map(c => ({ atuacao: c.atuacao, nome: c.nome, crm: c.crm }))));
      }
    } else {
      console.log("[process-descricao-cirurgica] ⚠️ Médico logado sem nome e sem CRM cadastrado. Não é possível reconhecer atuação.");
    }
  } catch (atuacaoErr) {
    console.error("[process-descricao-cirurgica] Erro ao reconhecer atuação:", atuacaoErr);
  }

  // 6) Atualizar os itens de faturamento existentes com quantidade_executada
  // ou inserir novos procedimentos se não existirem - COM VALIDAÇÃO CBHPM
  if (Array.isArray(procedimentosData) && procedimentosData.length > 0) {
    console.log("[process-descricao-cirurgica] Processando", procedimentosData.length, "procedimentos...");

    // Buscar o medico_id do faturamento
    const { data: faturamentoInfo, error: faturamentoError } = await supabase
      .from("faturamentos")
      .select("medico_id")
      .eq("id", faturamentoId)
      .single();

    const medicoId = faturamentoInfo?.medico_id ?? userId;

    // Buscar todos os itens existentes para este faturamento
    const { data: existingItems, error: existingItemsError } = await supabase
      .from("itens_faturamento")
      .select("id, codigo_procedimento, descricao_procedimento")
      .eq("faturamento_id", faturamentoId);

    if (existingItemsError) {
      console.error("[process-descricao-cirurgica] Erro ao buscar itens existentes:", existingItemsError);
    }

    const existingItemsList = existingItems || [];

    // Se não há itens pré-existentes (cenário sem guia de autorização/solicitação),
    // todos os procedimentos extraídos devem ser inseridos diretamente.
    const semItensPreExistentes = existingItemsList.length === 0;
    console.log(
      "[process-descricao-cirurgica] Itens pré-existentes:",
      existingItemsList.length,
      "| Modo inserção direta:",
      semItensPreExistentes
    );

    // Função para normalizar texto para comparação (remove acentos, lowercase, trim)
    const normalizeText = (text: string | null | undefined): string => {
      if (!text) return "";
      return text
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
    };

    // Função para verificar se um procedimento já existe (só usada quando há itens pré-existentes)
    const findExistingItem = (codigo: string | null, descricao: string | null) => {
      if (codigo) {
        const byCode = existingItemsList.find(
          (item) => item.codigo_procedimento === codigo
        );
        if (byCode) return byCode;
      }
      if (descricao) {
        const normalizedDescricao = normalizeText(descricao);
        const byDescription = existingItemsList.find(
          (item) => normalizeText(item.descricao_procedimento) === normalizedDescricao
        );
        if (byDescription) return byDescription;
      }
      return null;
    };

    // Track procedures that need review (code was corrected or matched by description similarity)
    const procedimentosRevisao: Array<{
      item_faturamento_id: string | null;
      codigo_original: string | null;
      descricao_original: string | null;
      codigo_validado: string | null;
      descricao_validada: string | null;
      metodo_validacao: string;
      similaridade: number | null;
      necessita_revisao: boolean;
    }> = [];

    for (const proc of procedimentosData) {
      const codigoOriginal = proc.codigo_procedimento?.toString().trim() || null;
      const descricaoOriginal = proc.descricao_procedimento?.toString().trim() || null;
      const quantidadeExecutada = proc.quantidade_executada ?? 1;

      // Validar contra CBHPM para obter código/descrição corretos
      const validacao = await validarProcedimentoCbhpm(
        supabase,
        codigoOriginal,
        descricaoOriginal,
        0.7 // limiar de similaridade 70% (aumentado para reduzir falsos positivos)
      );

      if (!validacao.valido || !validacao.codigo_validado) {
        console.log(
          `[process-descricao-cirurgica] ❌ Procedimento rejeitado (não encontrado na CBHPM): codigo="${codigoOriginal}", descricao="${descricaoOriginal?.slice(0, 50)}..."`
        );
        // Add rejected procedure to review list so doctor can provide correct code
        procedimentosRevisao.push({
          item_faturamento_id: null,
          codigo_original: codigoOriginal,
          descricao_original: descricaoOriginal,
          codigo_validado: null,
          descricao_validada: null,
          metodo_validacao: "nao_encontrado",
          similaridade: null,
          necessita_revisao: true,
        });
        continue;
      }

      const codigoProcedimento = validacao.codigo_validado;
      const descricaoProcedimento = validacao.descricao_validada;

      // Determine if this procedure needs review
      // Needs review if: code was changed AND method was not exact match
      const foiCorrigido = codigoOriginal !== codigoProcedimento;
      const necessitaRevisao = foiCorrigido && validacao.metodo_validacao !== "codigo_exato";

      // Log detalhado: mostrar se houve mudança entre o que a IA extraiu e o que foi validado
      if (codigoOriginal !== codigoProcedimento) {
        console.log(
          `[process-descricao-cirurgica] ⚠️ Código CORRIGIDO pela validação CBHPM: "${codigoOriginal}" → "${codigoProcedimento}" (${validacao.metodo_validacao}, similaridade: ${validacao.similaridade ? (validacao.similaridade * 100).toFixed(1) + '%' : 'N/A'})`
        );
      }
      console.log(
        `[process-descricao-cirurgica] ✅ Procedimento validado (${validacao.metodo_validacao}): ${codigoProcedimento} - ${descricaoProcedimento?.slice(0, 60)}`
      );

      let insertedItemId: string | null = null;

      if (semItensPreExistentes) {
        // Sem guia de autorização: inserir todos os procedimentos diretamente
        const { data: newItem, error: insertError } = await supabase
          .from("itens_faturamento")
          .insert({
            faturamento_id: faturamentoId,
            medico_id: medicoId,
            codigo_procedimento: codigoProcedimento ?? null,
            descricao_procedimento: descricaoProcedimento ?? null,
            quantidade_autorizada: quantidadeExecutada,
            quantidade_executada: quantidadeExecutada,
            quantidade: quantidadeExecutada,
            status_item: "pendente",
          })
          .select("id, codigo_procedimento, descricao_procedimento")
          .single();

        if (insertError) {
          console.error("[process-descricao-cirurgica] Erro ao inserir item (modo direto):", insertError);
        } else {
          console.log(
            "[process-descricao-cirurgica] Novo item inserido (modo direto):",
            codigoProcedimento || descricaoProcedimento
          );
          if (newItem) {
            existingItemsList.push(newItem);
            insertedItemId = newItem.id;
          }
        }
      } else {
        // Com itens pré-existentes (veio de guia de autorização): atualizar ou inserir se novo
        const existingItem = findExistingItem(codigoProcedimento, descricaoProcedimento);

        if (existingItem) {
          const updateFields: Record<string, unknown> = {
            quantidade_executada: quantidadeExecutada,
            medico_id: medicoId,
            updated_at: new Date().toISOString(),
          };

          if (descricaoProcedimento && !existingItem.descricao_procedimento) {
            updateFields.descricao_procedimento = descricaoProcedimento;
          }
          if (codigoProcedimento && !existingItem.codigo_procedimento) {
            updateFields.codigo_procedimento = codigoProcedimento;
          }

          const { error: updateItemError } = await supabase
            .from("itens_faturamento")
            .update(updateFields)
            .eq("id", existingItem.id);

          if (updateItemError) {
            console.error("[process-descricao-cirurgica] Erro ao atualizar item:", updateItemError);
          } else {
            console.log("[process-descricao-cirurgica] Item atualizado:", codigoProcedimento || descricaoProcedimento);
            insertedItemId = existingItem.id;
          }
        } else if (codigoProcedimento || descricaoProcedimento) {
          // Procedimento novo não presente na guia de autorização: inserir
          const { data: newItem, error: insertError } = await supabase
            .from("itens_faturamento")
            .insert({
              faturamento_id: faturamentoId,
              medico_id: medicoId,
              codigo_procedimento: codigoProcedimento ?? null,
              descricao_procedimento: descricaoProcedimento ?? null,
              quantidade_autorizada: quantidadeExecutada,
              quantidade_executada: quantidadeExecutada,
              quantidade: quantidadeExecutada,
              status_item: "pendente",
            })
            .select("id, codigo_procedimento, descricao_procedimento")
            .single();

          if (insertError) {
            console.error("[process-descricao-cirurgica] Erro ao inserir item:", insertError);
          } else {
            console.log("[process-descricao-cirurgica] Novo item inserido:", codigoProcedimento || descricaoProcedimento);
            if (newItem) {
              existingItemsList.push(newItem);
              insertedItemId = newItem.id;
            }
          }
        }
      }

      // Add to review list
      procedimentosRevisao.push({
        item_faturamento_id: insertedItemId,
        codigo_original: codigoOriginal,
        descricao_original: descricaoOriginal,
        codigo_validado: codigoProcedimento,
        descricao_validada: descricaoProcedimento,
        metodo_validacao: validacao.metodo_validacao,
        similaridade: validacao.similaridade ?? null,
        necessita_revisao: necessitaRevisao,
      });
    }

    const temRevisaoPendente = procedimentosRevisao.some(p => p.necessita_revisao);
    console.log("[process-descricao-cirurgica] Processamento concluído com sucesso.",
      temRevisaoPendente ? `${procedimentosRevisao.filter(p => p.necessita_revisao).length} procedimento(s) precisam de revisão.` : "Nenhuma revisão necessária.");

    return new Response(
      JSON.stringify({
        success: true,
        faturamento_id: faturamentoId,
        dados_extraidos: {
          faturamento: faturamentoData,
          procedimentos: procedimentosData,
        },
        revisao_procedimentos: procedimentosRevisao,
        tem_revisao_pendente: temRevisaoPendente,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log("[process-descricao-cirurgica] Processamento concluído com sucesso (sem procedimentos).");

  return new Response(
    JSON.stringify({
      success: true,
      faturamento_id: faturamentoId,
      dados_extraidos: {
        faturamento: faturamentoData,
        procedimentos: procedimentosData,
      },
      revisao_procedimentos: [],
      tem_revisao_pendente: false,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});