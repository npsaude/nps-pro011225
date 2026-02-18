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
    .select("openai_api_token")
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
Você é um assistente especializado em faturamento médico e descrições cirúrgicas.

A partir das IMAGENS anexadas (fotos de descrições cirúrgicas),
extraia todos os dados relevantes para preencher os campos de faturamento.

IMPORTANTE:
- As imagens podem ser de DIFERENTES PARTES da mesma descrição cirúrgica.
- Analise TODAS as imagens e consolide as informações em um único JSON.
- Se um campo aparecer em múltiplas imagens, use o valor mais completo/legível.
- Use APENAS informações que aparecem claramente nos documentos.
- Se um campo não estiver presente ou não for possível inferir com segurança, use null nesse campo.
- Não invente dados.

Campos a extrair:

DADOS DA EXECUÇÃO (tabela faturamentos):
- data_cirurgia: Data da cirurgia (formato DD/MM/YYYY ou YYYY-MM-DD)
- hora_inicio: Hora de início da cirurgia (formato HH:MM)
- hora_fim: Hora de término da cirurgia (formato HH:MM)

DIAGNÓSTICO FINAL:
- cid_codigo: Código CID do diagnóstico (ex: "K80.2", "J18.9")
- diagnostico_descricao: Descrição do diagnóstico

EQUIPE CIRÚRGICA (MUITO IMPORTANTE - extrair todos os membros da equipe):
- cirurgiao_nome: Nome completo do cirurgião principal
- cirurgiao_crm: CRM do cirurgião principal (apenas o número)
- auxiliar1_nome: Nome completo do 1º auxiliar
- auxiliar1_crm: CRM do 1º auxiliar (apenas o número)
- auxiliar2_nome: Nome completo do 2º auxiliar
- auxiliar2_crm: CRM do 2º auxiliar (apenas o número)
- anestesista_nome: Nome completo do anestesista
- anestesista_crm: CRM do anestesista (apenas o número)

VALIDAÇÃO:
- assinatura_medica: Se há assinatura do médico no documento (true/false)
- data_assinatura: Data da assinatura (formato DD/MM/YYYY ou YYYY-MM-DD)

PROCEDIMENTOS EXECUTADOS (tabela itens_faturamento):
- procedimentos: Array de procedimentos realizados, cada um com:
  - codigo_procedimento: Código TUSS ou código do procedimento
  - descricao_procedimento: Descrição do procedimento realizado
  - quantidade_executada: Quantidade executada (número)

Responda APENAS com um JSON válido, sem comentários ou explicações extras, no formato abaixo:

{
  "faturamento": {
    "data_cirurgia": string | null,
    "hora_inicio": string | null,
    "hora_fim": string | null,
    "cid_codigo": string | null,
    "diagnostico_descricao": string | null,
    "cirurgiao_nome": string | null,
    "cirurgiao_crm": string | null,
    "auxiliar1_nome": string | null,
    "auxiliar1_crm": string | null,
    "auxiliar2_nome": string | null,
    "auxiliar2_crm": string | null,
    "anestesista_nome": string | null,
    "anestesista_crm": string | null,
    "assinatura_medica": boolean | null,
    "data_assinatura": string | null
  },
  "procedimentos": [
    {
      "codigo_procedimento": string | null,
      "descricao_procedimento": string | null,
      "quantidade_executada": number | null
    }
  ] | null
}
`;

  // 4) Chamar GPT-4 Vision para analisar as imagens
  console.log("[process-descricao-cirurgica] Chamando GPT-4o-mini para análise de imagens...");

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
              "Você é um assistente de IA especializado em leitura de descrições cirúrgicas (imagens) e faturamento médico. Sempre responda com JSON válido.",
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
  const procedimentosData = parsed?.procedimentos ?? [];

  // 5) Atualizar o faturamento existente com os dados extraídos
  const filePaths = files.map((f) => f.path);

  const updateData: Record<string, unknown> = {
    url_descricao_cirurgica: filePaths,
    updated_at: new Date().toISOString(),
  };

  // Dados da execução
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

  // Equipe Cirúrgica - Anestesista
  if (faturamentoData.anestesista_nome) {
    updateData.anestesista_nome = faturamentoData.anestesista_nome;
  }
  if (faturamentoData.anestesista_crm) {
    updateData.anestesista_crm = faturamentoData.anestesista_crm;
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

  // 6) Atualizar os itens de faturamento existentes com quantidade_executada
  // ou inserir novos procedimentos se não existirem
  if (Array.isArray(procedimentosData) && procedimentosData.length > 0) {
    console.log("[process-descricao-cirurgica] Processando", procedimentosData.length, "procedimentos...");

    // Buscar o medico_id do faturamento
    const { data: faturamentoInfo, error: faturamentoError } = await supabase
      .from("faturamentos")
      .select("medico_id")
      .eq("id", faturamentoId)
      .single();

    const medicoId = faturamentoInfo?.medico_id ?? userId;

    for (const proc of procedimentosData) {
      const codigoProcedimento = proc.codigo_procedimento;
      const quantidadeExecutada = proc.quantidade_executada ?? 1;

      if (codigoProcedimento) {
        // Tentar encontrar item existente pelo código do procedimento
        const { data: existingItem, error: findError } = await supabase
          .from("itens_faturamento")
          .select("id")
          .eq("faturamento_id", faturamentoId)
          .eq("codigo_procedimento", codigoProcedimento)
          .maybeSingle();

        if (existingItem) {
          // Atualizar item existente com quantidade_executada
          const { error: updateItemError } = await supabase
            .from("itens_faturamento")
            .update({
              quantidade_executada: quantidadeExecutada,
              descricao_procedimento: proc.descricao_procedimento ?? undefined,
              medico_id: medicoId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingItem.id);

          if (updateItemError) {
            console.error("[process-descricao-cirurgica] Erro ao atualizar item:", updateItemError);
          } else {
            console.log("[process-descricao-cirurgica] Item atualizado:", codigoProcedimento);
          }
        } else {
          // Inserir novo item
          const { error: insertError } = await supabase
            .from("itens_faturamento")
            .insert({
              faturamento_id: faturamentoId,
              medico_id: medicoId,
              codigo_procedimento: codigoProcedimento,
              descricao_procedimento: proc.descricao_procedimento ?? null,
              quantidade_autorizada: quantidadeExecutada,
              quantidade_executada: quantidadeExecutada,
              quantidade: quantidadeExecutada,
              status_item: "pendente",
            });

          if (insertError) {
            console.error("[process-descricao-cirurgica] Erro ao inserir item:", insertError);
          } else {
            console.log("[process-descricao-cirurgica] Novo item inserido:", codigoProcedimento);
          }
        }
      } else if (proc.descricao_procedimento) {
        // Se não tem código mas tem descrição, inserir novo item
        const { error: insertError } = await supabase
          .from("itens_faturamento")
          .insert({
            faturamento_id: faturamentoId,
            medico_id: medicoId,
            codigo_procedimento: null,
            descricao_procedimento: proc.descricao_procedimento,
            quantidade_autorizada: quantidadeExecutada,
            quantidade_executada: quantidadeExecutada,
            quantidade: quantidadeExecutada,
            status_item: "pendente",
          });

        if (insertError) {
          console.error("[process-descricao-cirurgica] Erro ao inserir item sem código:", insertError);
        } else {
          console.log("[process-descricao-cirurgica] Novo item inserido (sem código):", proc.descricao_procedimento);
        }
      }
    }
  }

  console.log("[process-descricao-cirurgica] Processamento concluído com sucesso.");

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
