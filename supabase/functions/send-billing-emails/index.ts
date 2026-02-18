// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface RequestBody {
  faturamentoId: string;
  userEmail: string;
  userName: string;
}

interface ClinicaData {
  id: string;
  nome_fantasia: string;
  contato: string | null;
  email_contato_faturamento: string | null;
}

interface FaturamentoData {
  id: string;
  paciente_nome: string | null;
  paciente_convenio: string | null;
  data_cirurgia: string | null;
  hora_inicio: string | null;
  hospital_nome: string | null;
  instituicao_cirurgia_id: string | null;
  instituicao_faturamento_id: string | null;
  url_guia_autorizacao: string[];
  url_descricao_cirurgica: string[];
  url_guia_honorarios: string[];
}

// Formatar data para exibição
function formatarData(data: string | null): string {
  if (!data) return "";
  try {
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return data;
  }
}

// Formatar hora para exibição
function formatarHora(hora: string | null): string {
  if (!hora) return "";
  if (hora.includes(":")) {
    return hora.substring(0, 5);
  }
  return hora;
}

// Gerar corpo do email "Não enviar" (para instituição da cirurgia)
function gerarEmailNaoEnviar(
  contato: string,
  pacienteNome: string,
  convenio: string,
  dataCirurgia: string,
  horaInicio: string,
  nomeUsuario: string
): string {
  return `Prezado(a) ${contato || "Responsável"}.

Informamos que o faturamento do(a) paciente ${pacienteNome || "N/A"}, realizado pelo convênio ${convenio || "N/A"}, na data ${dataCirurgia}, horário de início ${horaInicio}, NÃO deverá ser realizado por essa instituição.

Em anexo, envio os documentos para consulta.

Atenciosamente

${nomeUsuario}`;
}

// Gerar corpo do email "Enviar" (para instituição de faturamento)
function gerarEmailEnviar(
  contato: string,
  pacienteNome: string,
  convenio: string,
  dataCirurgia: string,
  horaInicio: string,
  hospitalNome: string,
  nomeUsuario: string
): string {
  return `Prezado(a) ${contato || "Responsável"}.

Solicitamos faturamento do(a) paciente ${pacienteNome || "N/A"}, realizado pelo convênio ${convenio || "N/A"}, na data ${dataCirurgia}, horário de início ${horaInicio}, que ocorreu no ${hospitalNome || "hospital"}.

Em anexo, envio os documentos para consulta.

Atenciosamente

${nomeUsuario}`;
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

  console.log("[send-billing-emails] Iniciando processamento...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  
  // Configurações SMTP da Hostinger (configuradas como secrets no Supabase)
  const smtpHost = Deno.env.get("SMTP_HOST") ?? "smtp.hostinger.com";
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") ?? "465");
  const smtpUser = Deno.env.get("SMTP_USER") ?? "";
  const smtpPass = Deno.env.get("SMTP_PASS") ?? "";
  const smtpFrom = Deno.env.get("SMTP_FROM") ?? smtpUser;
  const smtpFromName = Deno.env.get("SMTP_FROM_NAME") ?? "Conmedic";

  if (!supabaseUrl || !serviceKey) {
    console.error("[send-billing-emails] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
    return new Response(
      JSON.stringify({
        error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!smtpUser || !smtpPass) {
    console.error("[send-billing-emails] Configurações SMTP não encontradas.");
    console.error("[send-billing-emails] Configure os secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_FROM_NAME");
    return new Response(
      JSON.stringify({
        error: "Configurações SMTP não encontradas. Configure os secrets SMTP_USER e SMTP_PASS no Supabase.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: RequestBody;
  try {
    const raw = await req.text();
    body = JSON.parse(raw) as RequestBody;
  } catch {
    console.error("[send-billing-emails] Body JSON inválido.");
    return new Response(
      JSON.stringify({ error: "Body JSON inválido." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { faturamentoId, userEmail, userName } = body;

  console.log("[send-billing-emails] faturamentoId:", faturamentoId);
  console.log("[send-billing-emails] userEmail:", userEmail);
  console.log("[send-billing-emails] userName:", userName);

  if (!faturamentoId || !userEmail || !userName) {
    console.error("[send-billing-emails] Parâmetros obrigatórios faltando.");
    return new Response(
      JSON.stringify({
        error: "Parâmetros obrigatórios: faturamentoId, userEmail e userName.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // 1) Buscar dados do faturamento
  const { data: faturamento, error: faturamentoError } = await supabase
    .from("faturamentos")
    .select(`
      id,
      paciente_nome,
      paciente_convenio,
      data_cirurgia,
      hora_inicio,
      hospital_nome,
      instituicao_cirurgia_id,
      instituicao_faturamento_id,
      url_guia_autorizacao,
      url_descricao_cirurgica,
      url_guia_honorarios
    `)
    .eq("id", faturamentoId)
    .single();

  if (faturamentoError || !faturamento) {
    console.error("[send-billing-emails] Erro ao buscar faturamento:", faturamentoError);
    return new Response(
      JSON.stringify({
        error: "Faturamento não encontrado.",
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const fat = faturamento as FaturamentoData;
  console.log("[send-billing-emails] Faturamento encontrado:", fat.id);

  // 2) Buscar dados das instituições
  const instituicaoCirurgiaId = fat.instituicao_cirurgia_id;
  const instituicaoFaturamentoId = fat.instituicao_faturamento_id;

  if (!instituicaoFaturamentoId) {
    console.error("[send-billing-emails] Instituição de faturamento não definida.");
    return new Response(
      JSON.stringify({
        error: "Instituição de faturamento não definida no faturamento.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Buscar instituição de faturamento
  const { data: clinicaFaturamento, error: clinicaFatError } = await supabase
    .from("clinicas")
    .select("id, nome_fantasia, contato, email_contato_faturamento")
    .eq("id", instituicaoFaturamentoId)
    .single();

  if (clinicaFatError || !clinicaFaturamento) {
    console.error("[send-billing-emails] Erro ao buscar clínica de faturamento:", clinicaFatError);
    return new Response(
      JSON.stringify({
        error: "Instituição de faturamento não encontrada.",
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const clinicaFat = clinicaFaturamento as ClinicaData;
  console.log("[send-billing-emails] Clínica de faturamento:", clinicaFat.nome_fantasia);

  // Verificar se tem email configurado
  if (!clinicaFat.email_contato_faturamento) {
    console.error("[send-billing-emails] Email de faturamento não configurado para a clínica:", clinicaFat.nome_fantasia);
    return new Response(
      JSON.stringify({
        error: `A instituição "${clinicaFat.nome_fantasia}" não possui email de faturamento configurado.`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Buscar instituição da cirurgia (se diferente)
  let clinicaCirurgia: ClinicaData | null = null;
  const instituicoesDiferentes = instituicaoCirurgiaId && instituicaoCirurgiaId !== instituicaoFaturamentoId;

  if (instituicoesDiferentes) {
    const { data: clinicaCir, error: clinicaCirError } = await supabase
      .from("clinicas")
      .select("id, nome_fantasia, contato, email_contato_faturamento")
      .eq("id", instituicaoCirurgiaId)
      .single();

    if (!clinicaCirError && clinicaCir) {
      clinicaCirurgia = clinicaCir as ClinicaData;
      console.log("[send-billing-emails] Clínica da cirurgia:", clinicaCirurgia.nome_fantasia);
    }
  }

  // 3) Preparar anexos (URLs assinadas dos PDFs)
  const bucketName = "NPS-pro";
  const attachments: { filename: string; content: Uint8Array; contentType: string }[] = [];

  // Função para baixar arquivo
  async function downloadFile(path: string, filename: string): Promise<{ filename: string; content: Uint8Array; contentType: string } | null> {
    try {
      // Criar URL assinada
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(path, 60 * 60); // 1 hora

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("[send-billing-emails] Erro ao criar URL assinada para:", path, signedUrlError);
        return null;
      }

      // Baixar o arquivo
      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        console.error("[send-billing-emails] Erro ao baixar arquivo:", path, response.status);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Determinar content type
      const ext = path.split(".").pop()?.toLowerCase() || "";
      let contentType = "application/octet-stream";
      if (ext === "pdf") contentType = "application/pdf";
      else if (ext === "png") contentType = "image/png";
      else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
      else if (ext === "gif") contentType = "image/gif";
      else if (ext === "webp") contentType = "image/webp";

      return {
        filename,
        content: uint8Array,
        contentType,
      };
    } catch (error) {
      console.error("[send-billing-emails] Erro ao processar arquivo:", path, error);
      return null;
    }
  }

  // Processar guia de autorização
  if (fat.url_guia_autorizacao && fat.url_guia_autorizacao.length > 0) {
    for (let i = 0; i < fat.url_guia_autorizacao.length; i++) {
      const path = fat.url_guia_autorizacao[i];
      const ext = path.split(".").pop()?.toLowerCase() || "pdf";
      const filename = `guia_autorizacao_${i + 1}.${ext}`;
      const attachment = await downloadFile(path, filename);
      if (attachment) {
        attachments.push(attachment);
      }
    }
  }

  // Processar descrição cirúrgica
  if (fat.url_descricao_cirurgica && fat.url_descricao_cirurgica.length > 0) {
    for (let i = 0; i < fat.url_descricao_cirurgica.length; i++) {
      const path = fat.url_descricao_cirurgica[i];
      const ext = path.split(".").pop()?.toLowerCase() || "pdf";
      const filename = `descricao_cirurgica_${i + 1}.${ext}`;
      const attachment = await downloadFile(path, filename);
      if (attachment) {
        attachments.push(attachment);
      }
    }
  }

  // Processar guia de honorários
  if (fat.url_guia_honorarios && fat.url_guia_honorarios.length > 0) {
    for (let i = 0; i < fat.url_guia_honorarios.length; i++) {
      const path = fat.url_guia_honorarios[i];
      const ext = path.split(".").pop()?.toLowerCase() || "pdf";
      const filename = `guia_honorarios_${i + 1}.${ext}`;
      const attachment = await downloadFile(path, filename);
      if (attachment) {
        attachments.push(attachment);
      }
    }
  }

  // Buscar PDF da guia de honorários na tabela guia_honorarios
  const { data: guiaHonorarios } = await supabase
    .from("guia_honorarios")
    .select("pdf_guia_honorario")
    .eq("id", fat.id)
    .maybeSingle();

  if (guiaHonorarios?.pdf_guia_honorario) {
    const attachment = await downloadFile(
      guiaHonorarios.pdf_guia_honorario,
      "guia_honorarios.pdf"
    );
    if (attachment) {
      attachments.push(attachment);
    }
  }

  console.log("[send-billing-emails] Total de anexos preparados:", attachments.length);

  // 4) Preparar dados formatados
  const dataCirurgiaFormatada = formatarData(fat.data_cirurgia);
  const horaInicioFormatada = formatarHora(fat.hora_inicio);

  // 5) Configurar cliente SMTP
  const client = new SmtpClient();

  try {
    console.log("[send-billing-emails] Conectando ao servidor SMTP...");
    console.log("[send-billing-emails] Host:", smtpHost, "Port:", smtpPort);
    
    await client.connectTLS({
      hostname: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
    });

    console.log("[send-billing-emails] Conectado ao SMTP com sucesso!");
  } catch (smtpError) {
    console.error("[send-billing-emails] Erro ao conectar ao SMTP:", smtpError);
    return new Response(
      JSON.stringify({
        error: "Erro ao conectar ao servidor de email. Verifique as configurações SMTP.",
        details: String(smtpError),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // 6) Enviar emails
  const emailsEnviados: string[] = [];
  const errosEnvio: string[] = [];

  // Função para enviar email via SMTP
  async function enviarEmail(
    to: string,
    subject: string,
    text: string,
    cc: string
  ): Promise<boolean> {
    try {
      console.log("[send-billing-emails] Enviando email para:", to);

      // Preparar anexos para o SMTP
      const smtpAttachments = attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        encoding: "binary" as const,
      }));

      await client.send({
        from: `${smtpFromName} <${smtpFrom}>`,
        to: to,
        cc: cc,
        subject: subject,
        content: text,
        attachments: smtpAttachments.length > 0 ? smtpAttachments : undefined,
      });

      console.log("[send-billing-emails] Email enviado com sucesso para:", to);
      return true;
    } catch (error) {
      console.error("[send-billing-emails] Erro ao enviar email para:", to, error);
      return false;
    }
  }

  // Cenário A: Instituições diferentes - enviar 2 emails
  if (instituicoesDiferentes && clinicaCirurgia) {
    // Email 1: Para instituição da cirurgia (NÃO faturar)
    if (clinicaCirurgia.email_contato_faturamento) {
      const emailNaoEnviar = gerarEmailNaoEnviar(
        clinicaCirurgia.contato || "",
        fat.paciente_nome || "",
        fat.paciente_convenio || "",
        dataCirurgiaFormatada,
        horaInicioFormatada,
        userName
      );

      const enviado = await enviarEmail(
        clinicaCirurgia.email_contato_faturamento,
        `[NÃO FATURAR] Documentação Cirúrgica - ${fat.paciente_nome || "Paciente"}`,
        emailNaoEnviar,
        userEmail
      );

      if (enviado) {
        emailsEnviados.push(clinicaCirurgia.email_contato_faturamento);
      } else {
        errosEnvio.push(`Falha ao enviar para ${clinicaCirurgia.nome_fantasia}`);
      }
    } else {
      console.log("[send-billing-emails] Instituição da cirurgia sem email configurado, pulando...");
    }

    // Email 2: Para instituição de faturamento (FATURAR)
    const emailEnviar = gerarEmailEnviar(
      clinicaFat.contato || "",
      fat.paciente_nome || "",
      fat.paciente_convenio || "",
      dataCirurgiaFormatada,
      horaInicioFormatada,
      fat.hospital_nome || clinicaCirurgia?.nome_fantasia || "",
      userName
    );

    const enviado = await enviarEmail(
      clinicaFat.email_contato_faturamento!,
      `[FATURAMENTO] Documentação Cirúrgica - ${fat.paciente_nome || "Paciente"}`,
      emailEnviar,
      userEmail
    );

    if (enviado) {
      emailsEnviados.push(clinicaFat.email_contato_faturamento!);
    } else {
      errosEnvio.push(`Falha ao enviar para ${clinicaFat.nome_fantasia}`);
    }
  } else {
    // Cenário B: Mesma instituição - enviar apenas 1 email
    const emailEnviar = gerarEmailEnviar(
      clinicaFat.contato || "",
      fat.paciente_nome || "",
      fat.paciente_convenio || "",
      dataCirurgiaFormatada,
      horaInicioFormatada,
      fat.hospital_nome || clinicaFat.nome_fantasia,
      userName
    );

    const enviado = await enviarEmail(
      clinicaFat.email_contato_faturamento!,
      `[FATURAMENTO] Documentação Cirúrgica - ${fat.paciente_nome || "Paciente"}`,
      emailEnviar,
      userEmail
    );

    if (enviado) {
      emailsEnviados.push(clinicaFat.email_contato_faturamento!);
    } else {
      errosEnvio.push(`Falha ao enviar para ${clinicaFat.nome_fantasia}`);
    }
  }

  // Fechar conexão SMTP
  try {
    await client.close();
    console.log("[send-billing-emails] Conexão SMTP fechada.");
  } catch (closeError) {
    console.error("[send-billing-emails] Erro ao fechar conexão SMTP:", closeError);
  }

  // 7) Atualizar status do faturamento
  if (emailsEnviados.length > 0) {
    const agora = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("faturamentos")
      .update({
        email_status: "ENVIADO",
        email_enviado_em: agora,
        updated_at: agora,
      })
      .eq("id", faturamentoId);

    if (updateError) {
      console.error("[send-billing-emails] Erro ao atualizar status do faturamento:", updateError);
    } else {
      console.log("[send-billing-emails] Status do faturamento atualizado para ENVIADO");
    }
  }

  // 8) Retornar resultado
  const sucesso = emailsEnviados.length > 0;
  const mensagem = sucesso
    ? `Email(s) enviado(s) com sucesso para: ${emailsEnviados.join(", ")}`
    : "Nenhum email foi enviado.";

  console.log("[send-billing-emails] Processamento concluído:", mensagem);

  return new Response(
    JSON.stringify({
      success: sucesso,
      message: mensagem,
      emails_enviados: emailsEnviados,
      erros: errosEnvio,
      anexos_count: attachments.length,
    }),
    {
      status: sucesso ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
