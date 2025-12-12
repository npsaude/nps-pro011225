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

interface RequestBody {
  filePath: string;
}

serve(async (req) => {
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    const msg =
      "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados na Edge Function.";
    console.error(msg);
    return new Response(
      JSON.stringify({ error: msg }),
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
  } catch (e) {
    console.error("Body JSON inválido:", e);
    return new Response(
      JSON.stringify({
        error: "Body JSON inválido.",
        details: e instanceof Error ? e.message : String(e),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { filePath } = body;

  if (!filePath || typeof filePath !== "string") {
    const msg =
      "Parâmetro obrigatório: filePath (path do PDF no bucket NPS-pro).";
    console.error(msg, "filePath recebido:", filePath);
    return new Response(
      JSON.stringify({ error: msg }),
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
    console.error("Erro ao carregar app_settings:", settingsError);
    return new Response(
      JSON.stringify({
        error: "Erro ao carregar configurações da aplicação (app_settings).",
        details: settingsError.message,
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
    const msg =
      "Token da OpenAI não configurado em app_settings (campo openai_api_token).";
    console.error(msg);
    return new Response(
      JSON.stringify({ error: msg }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const bucketName = "NPS-pro";

  // 2) Criar URL assinada para o arquivo PDF no storage
  const { data: signed, error: signedError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, 60 * 60);

  if (signedError || !signed?.signedUrl) {
    console.error(
      "Erro ao criar URL assinada para extrato de pagamento:",
      filePath,
      signedError,
    );
    return new Response(
      JSON.stringify({
        error: "Não foi possível criar URL assinada para o PDF.",
        details: signedError?.message ?? "URL assinada ausente",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const signedUrl = signed.signedUrl;
  console.log("URL assinada do PDF:", signedUrl);

  // 3) Baixar o PDF da URL assinada e enviar à Files API
  let fileId: string | null = null;

  try {
    console.log("Baixando PDF do storage via URL assinada...");
    const pdfResp = await fetch(signedUrl);
    if (!pdfResp.ok) {
      const txt = await pdfResp.text();
      console.error("Falha ao baixar PDF:", txt);
      return new Response(
        JSON.stringify({
          error:
            "Falha ao baixar o PDF do storage para enviar ao ChatGPT.",
          details: txt,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const pdfArrayBuffer = await pdfResp.arrayBuffer();
    const pdfBlob = new Blob([pdfArrayBuffer], {
      type: "application/pdf",
    });

    const formData = new FormData();
    formData.append("file", pdfBlob, "extrato_pagamento.pdf");
    formData.append("purpose", "assistants");

    console.log("Enviando PDF para OpenAI Files API...");
    const uploadResp = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiToken}`,
      },
      body: formData,
    });

    if (!uploadResp.ok) {
      const errText = await uploadResp.text();
      console.error("Erro ao enviar PDF para a OpenAI Files API:", errText);
      return new Response(
        JSON.stringify({
          error:
            "Não foi possível enviar o PDF para a OpenAI (Files API).",
          details: errText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const uploadJson = await uploadResp.json();
    fileId = uploadJson?.id ?? null;

    if (!fileId) {
      console.error("Resposta da Files API sem id de arquivo:", uploadJson);
      return new Response(
        JSON.stringify({
          error:
            "A OpenAI não retornou um id de arquivo para o PDF enviado.",
          details: JSON.stringify(uploadJson),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (e) {
    console.error("Erro inesperado ao enviar PDF para OpenAI:", e);
    return new Response(
      JSON.stringify({
        error:
          "Erro inesperado ao enviar o PDF para a OpenAI. Verifique os logs.",
        details: e instanceof Error ? e.message : String(e),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 5) Prompt rígido para extrair o CSV de repasse
  const csvPrompt =
    "Usando o PDF de relatório analítico de repasse em anexo como referência, " +
    "extraia os dados do PDF e crie um CSV com as seguintes instruções detalhadas:\n\n" +
    "1. Nome do médico: campo textual (por exemplo: 'Jose Airton Case Neto'). Use exatamente o nome que estiver no PDF.\n" +
    "2. Período: campo textual com o período do relatório (por exemplo, o período que aparece no cabeçalho). Use o texto exato do PDF.\n\n" +
    "3. Para cada atendimento/paciente, devem existir uma ou mais linhas, com as seguintes colunas:\n" +
    "   3.1 NomePaciente: nome do paciente.\n" +
    "   3.2 DataAtendimento: data do atendimento.\n" +
    "   3.3 DataPagamento: data do pagamento.\n" +
    "   3.4 Pagante: operadora/pagante.\n" +
    "   3.5 CodigoProcedimento: código do procedimento.\n" +
    "   3.6 DescricaoProcedimento: descrição do procedimento.\n" +
    "   3.7 ValorBase: valor base do procedimento.\n" +
    "   3.8 Glosa: valor de glosa.\n" +
    "   3.9 Desconto: valor de desconto.\n" +
    "   3.10 Liquido: valor líquido.\n\n" +
    "   Podem existir várias linhas de procedimentos para o mesmo paciente/atendimento. " +
    "   Você só deve criar uma linha se o procedimento realmente existir na tabela do PDF, com código, descrição e valores claramente visíveis.\n\n" +
    "4. Total de repasse (TotalRepasse):\n" +
    "   Para cada atendimento (ou conjunto de linhas referentes ao mesmo paciente/atendimento), use o valor de repasse indicado no PDF para aquele atendimento.\n" +
    "   Este valor deve aparecer APENAS NA ÚLTIMA LINHA de cada atendimento/paciente, na coluna TotalRepasse.\n" +
    "   Em todas as outras linhas do mesmo atendimento, deixe a coluna TotalRepasse vazia.\n" +
    "   Se o PDF não trouxer explicitamente um total de repasse para um atendimento, deixe TotalRepasse vazio (não invente).\n\n" +
    "REGRAS RÍGIDAS E OBRIGATÓRIAS:\n" +
    "- NÃO invente procedimentos, códigos, pacientes, datas ou valores. " +
    "  Se não encontrar algo claramente no PDF, deixe o campo vazio.\n" +
    "- NÃO crie linhas extras apenas por inferência. Cada linha do CSV deve corresponder a um procedimento visível no PDF.\n" +
    "- Use SEMPRE vírgula como separador decimal, igual ao PDF.\n" +
    "- Não arredonde, some ou subtraia valores por conta própria; apenas copie os valores exatamente como aparecem no relatório.\n" +
    "- Não altere a descrição dos procedimentos; use o texto exato do PDF.\n" +
    "- Se estiver em dúvida sobre qualquer campo, deixe-o vazio em vez de tentar adivinhar.\n\n" +
    "FORMATO DO CSV:\n" +
    "A primeira linha do CSV deve ser o cabeçalho com as colunas na ordem abaixo:\n" +
    "NomeMedico;Periodo;NomePaciente;DataAtendimento;DataPagamento;Pagante;CodigoProcedimento;DescricaoProcedimento;ValorBase;Glosa;Desconto;Liquido;TotalRepasse\n\n" +
    "As linhas seguintes devem trazer, linha a linha, os procedimentos exatamente conforme o PDF.\n\n" +
    "RETORNO:\n" +
    "Retorne APENAS o conteúdo CSV, usando ponto e vírgula (;) como separador de colunas e vírgula como separador decimal nos valores monetários. " +
    "Não inclua comentários, explicações, markdown ou qualquer texto fora do CSV.";

  // 6) Chamar a Responses API com input_file
  try {
    console.log("Chamando OpenAI Responses API com input_file para extrato...");

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiToken}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: csvPrompt,
              },
              {
                type: "input_file",
                file_id: fileId,
              },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Erro da OpenAI (Responses CSV):", errText);
      return new Response(
        JSON.stringify({
          error:
            "Erro ao chamar a API da OpenAI para gerar o CSV do extrato.",
          details: errText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const respJson = await resp.json();

    let csvText = "";
    try {
      const firstOutput = respJson?.output?.[0];
      const firstContent = firstOutput?.content?.[0];

      // Novo formato: type = "output_text" e text é STRING
      if (firstContent?.type === "output_text" && typeof firstContent.text === "string") {
        csvText = firstContent.text;
      } else if (
        firstContent?.text &&
        typeof firstContent.text === "object" &&
        typeof firstContent.text.value === "string"
      ) {
        // fallback para o caso de algum formato antigo em que text seja objeto { value }
        csvText = firstContent.text.value;
      }
    } catch (e) {
      console.error("Erro ao extrair CSV da resposta:", e, respJson);
    }

    if (!csvText) {
      console.error(
        "Resposta da OpenAI não contém texto CSV utilizável:",
        respJson,
      );
      return new Response(
        JSON.stringify({
          error:
            "A resposta da OpenAI não retornou nenhum CSV utilizável para o extrato.",
          details: JSON.stringify(respJson),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        csv: csvText,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error(
      "Erro inesperado ao chamar OpenAI Responses para extrato:",
      e,
    );
    return new Response(
      JSON.stringify({
        error:
          "Erro inesperado ao chamar a OpenAI para gerar o CSV de extrato.",
        details: e instanceof Error ? e.message : String(e),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});