// Disable TypeScript checking for this Deno Edge Function file, since it uses Deno-specific imports/globals.
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

interface UploadedFile {
  path: string;
}

interface RequestBody {
  userId: string;
  files: UploadedFile[];
}

serve(async (req) => {
  const method = req.method.toUpperCase();

  // Trata o preflight CORS ANTES de qualquer outra validação
  if (method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
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
    return new Response(
      JSON.stringify({ error: "Body JSON inválido." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { userId, files } = body;

  if (!userId || !files || !Array.isArray(files) || files.length === 0) {
    return new Response(
      JSON.stringify({
        error: "Parâmetros obrigatórios: userId e files (com ao menos 1 item).",
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
    console.error("Erro ao carregar app_settings:", settingsError);
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
        "Erro ao criar URL assinada para arquivo:",
        path,
        error,
      );
      continue;
    }

    signedUrls.push(data.signedUrl);
  }

  if (signedUrls.length === 0) {
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

  console.log("URLs assinadas enviadas para a OpenAI:", signedUrls);

  // 3) Instruções de extração e formato JSON esperado
  const jsonFormatInstructions = `
Você é um assistente especializado em faturamento médico e descrições cirúrgicas.

A partir das IMAGENS/PDFs anexados nesta conversa (fotos de prontuário, laudos, relatórios, etc.),
extraia todos os dados relevantes para preencher uma ficha de descrição cirúrgica.

Regra importante:
- Use APENAS informações que aparecem claramente nos documentos.
- Se um campo não estiver presente ou não for possível inferir com segurança, use null nesse campo.
- Não invente dados.

Retorne APENAS um JSON com o seguinte formato (sem comentários):

{
  "prontuario": string | null,
  "registro": string | null,
  "nome_social": string | null,
  "registro_civil": string | null,
  "cpf": string | null,
  "matricula": string | null,
  "data_nascimento": string | null,  // formato YYYY-MM-DD, se possível
  "idade": number | null,
  "sexo": string | null,

  "convenio_plano": string | null,
  "setor": string | null,
  "leito": string | null,
  "dthr_admissao": string | null,    // ISO datetime se possível

  "tipo_cirurgia": string | null,
  "data_inicio_procedimento": string | null, // YYYY-MM-DD
  "hora_inicio_procedimento": string | null, // HH:MM:SS
  "data_fim_procedimento": string | null,    // YYYY-MM-DD
  "hora_fim_procedimento": string | null,    // HH:MM:SS
  "diagnostico_pre_operatorio": string | null,
  "diagnostico_pos_operatorio": string | null,

  "procedimentos": [
    {
      "procedimento_id": string | null,
      "descricao_procedimento": string | null,
      "codigo_procedimento": string | null,
      "tipo_procedimento": string | null,
      "quantidade": number | null
    }
  ] | null,

  "equipe": [
    {
      "nome_profissional": string | null,
      "funcao": string | null,
      "conselho": string | null,
      "numero_conselho": string | null,
      "uf_conselho": string | null
    }
  ] | null,

  "descricao_cirurgica": string | null,

  "cirurgiao_responsavel": string | null,
  "cirurgiao_responsavel_crm": string | null,
  "data_hora_afere": string | null,
  "usuario_impressao": string | null,
  "data_hora_impressao": string | null,

  "materiais": [
    {
      "material_id": string | null,
      "nome_material": string | null,
      "descricao_material": string | null,
      "quantidade": number | null,
      "lote": string | null,
      "fabricante": string | null
    }
  ] | null,

  "diagnostico_pre_igual_pos": boolean | null,
  "houve_complicacoes": boolean | null,
  "descricao_complicacoes": string | null,
  "possui_peca_anatomo": boolean | null,
  "sangramento_estimado": string | null,
  "observacoes_adicionais": string | null,

  "uso_antibioticos": string | null,
  "profilaxia_tev_tvp": string | null,
  "troca_curativo": string | null,
  "dieta": string | null,
  "deambulacao": string | null,
  "previsao_alta": string | null,
  "acompanhamento_pela_instituicao": boolean | null,
  "outras_orientacoes": string | null
}

Não inclua explicações nem comentários fora do JSON.
`;

  // 4) Chamar OpenAI Chat Completions em modo multimodal (texto + imagens)
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
              "Você é um assistente de IA especializado em leitura de documentos médicos (imagens/PDFs) e faturamento. Sempre que solicitado, responda com JSON válido.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: jsonFormatInstructions,
              },
              ...signedUrls.map((url) => ({
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
    console.error("Erro da OpenAI:", errorText);
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
    console.error("Resposta da OpenAI sem conteúdo:", completion);
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
    console.error("Falha ao fazer parse do JSON da OpenAI:", e, messageContent);
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
    "Resposta da OpenAI parseada (primeiros 2000 caracteres):",
    JSON.stringify(parsed).slice(0, 2000),
  );

  // IMPORTANTE: usamos o objeto inteiro retornado pela OpenAI.
  // Se, por algum motivo, ela aninhar tudo dentro de "descricao_cirurgica",
  // fazemos um fallback para esse objeto interno.
  let desc: any = parsed;
  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    parsed.descricao_cirurgica &&
    typeof parsed.descricao_cirurgica === "object" &&
    !Array.isArray(parsed.descricao_cirurgica)
  ) {
    desc = parsed.descricao_cirurgica;
  }

  // 5) Montar objeto para inserir em descricoes_cirurgicas
  const insertData: Record<string, unknown> = {
    user_id: userId,
    status: "AGUARDANDO",

    prontuario: desc?.prontuario ?? null,
    registro: desc?.registro ?? null,
    nome_social: desc?.nome_social ?? null,
    registro_civil: desc?.registro_civil ?? null,
    cpf: desc?.cpf ?? null,
    matricula: desc?.matricula ?? null,
    data_nascimento: desc?.data_nascimento ?? null,
    idade: desc?.idade ?? null,
    sexo: desc?.sexo ?? null,

    convenio_plano: desc?.convenio_plano ?? null,
    setor: desc?.setor ?? null,
    leito: desc?.leito ?? null,
    dthr_admissao: desc?.dthr_admissao ?? null,

    tipo_cirurgia: desc?.tipo_cirurgia ?? null,
    data_inicio_procedimento: desc?.data_inicio_procedimento ?? null,
    hora_inicio_procedimento: desc?.hora_inicio_procedimento ?? null,
    data_fim_procedimento: desc?.data_fim_procedimento ?? null,
    hora_fim_procedimento: desc?.hora_fim_procedimento ?? null,
    diagnostico_pre_operatorio: desc?.diagnostico_pre_operatorio ?? null,
    diagnostico_pos_operatorio: desc?.diagnostico_pos_operatorio ?? null,

    procedimentos: desc?.procedimentos ?? null,
    equipe: desc?.equipe ?? null,
    descricao_cirurgica: desc?.descricao_cirurgica ?? null,

    cirurgiao_responsavel: desc?.cirurgiao_responsavel ?? null,
    cirurgiao_responsavel_crm: desc?.cirurgiao_responsavel_crm ?? null,
    data_hora_afere: desc?.data_hora_afere ?? null,
    usuario_impressao: desc?.usuario_impressao ?? null,
    data_hora_impressao: desc?.data_hora_impressao ?? null,

    materiais: desc?.materiais ?? null,

    diagnostico_pre_igual_pos:
      typeof desc?.diagnostico_pre_igual_pos === "boolean"
        ? desc.diagnostico_pre_igual_pos
        : null,
    houve_complicacoes:
      typeof desc?.houve_complicacoes === "boolean"
        ? desc.houve_complicacoes
        : null,
    descricao_complicacoes: desc?.descricao_complicacoes ?? null,
    possui_peca_anatomo:
      typeof desc?.possui_peca_anatomo === "boolean"
        ? desc.possui_peca_anatomo
        : null,
    sangramento_estimado: desc?.sangramento_estimado ?? null,
    observacoes_adicionais: desc?.observacoes_adicionais ?? null,

    uso_antibioticos: desc?.uso_antibioticos ?? null,
    profilaxia_tev_tvp: desc?.profilaxia_tev_tvp ?? null,
    troca_curativo: desc?.troca_curativo ?? null,
    dieta: desc?.dieta ?? null,
    deambulacao: desc?.deambulacao ?? null,
    previsao_alta: desc?.previsao_alta ?? null,
    acompanhamento_pela_instituicao:
      typeof desc?.acompanhamento_pela_instituicao === "boolean"
        ? desc.acompanhamento_pela_instituicao
        : null,
    outras_orientacoes: desc?.outras_orientacoes ?? null,
  };

  // 6) Inserir na tabela descricoes_cirurgicas
  const { data: inserted, error: insertError } = await supabase
    .from("descricoes_cirurgicas")
    .insert(insertData)
    .select("id")
    .single();

  if (insertError) {
    console.error(
      "Erro ao inserir em descricoes_cirurgicas:",
      insertError,
    );
    return new Response(
      JSON.stringify({
        error: "Erro ao salvar a descrição cirúrgica no banco.",
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
      descricao_cirurgica_id: inserted?.id,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});