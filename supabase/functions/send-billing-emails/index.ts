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
  guia_honorarios_id: string | null;
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

// Converter Uint8Array para Base64
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// Gerar boundary único para multipart
function generateBoundary(): string {
  return "----=_Part_" + Math.random().toString(36).substring(2);
}

// Construir email MIME com anexos
function buildMimeEmail(
  from: string,
  fromName: string,
  to: string,
  cc: string,
  subject: string,
  textBody: string,
  attachments: { filename: string; content: Uint8Array; contentType: string }[]
): string {
  const boundary = generateBoundary();
  
  let email = "";
  email += `From: ${fromName} <${from}>\r\n`;
  email += `To: ${to}\r\n`;
  if (cc) {
    email += `Cc: ${cc}\r\n`;
  }
  email += `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\r\n`;
  email += `MIME-Version: 1.0\r\n`;
  email += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
  email += `\r\n`;
  
  // Corpo do texto
  email += `--${boundary}\r\n`;
  email += `Content-Type: text/plain; charset=UTF-8\r\n`;
  email += `Content-Transfer-Encoding: base64\r\n`;
  email += `\r\n`;
  email += btoa(unescape(encodeURIComponent(textBody))) + `\r\n`;
  
  // Anexos
  for (const att of attachments) {
    email += `--${boundary}\r\n`;
    email += `Content-Type: ${att.contentType}; name="${att.filename}"\r\n`;
    email += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
    email += `Content-Transfer-Encoding: base64\r\n`;
    email += `\r\n`;
    email += uint8ArrayToBase64(att.content) + `\r\n`;
  }
  
  email += `--${boundary}--\r\n`;
  
  return email;
}

// Enviar email via SMTP usando conexão TCP direta
async function sendEmailViaSMTP(
  host: string,
  port: number,
  username: string,
  password: string,
  from: string,
  fromName: string,
  to: string,
  cc: string,
  subject: string,
  textBody: string,
  attachments: { filename: string; content: Uint8Array; contentType: string }[]
): Promise<{ success: boolean; error?: string }> {
  
  console.log("[send-billing-emails] Iniciando conexão SMTP...");
  
  try {
    // Conectar via TLS
    const conn = await Deno.connectTls({
      hostname: host,
      port: port,
    });
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    // Função para ler resposta do servidor
    async function readResponse(): Promise<string> {
      const buffer = new Uint8Array(4096);
      const n = await conn.read(buffer);
      if (n === null) return "";
      return decoder.decode(buffer.subarray(0, n));
    }
    
    // Função para enviar comando
    async function sendCommand(cmd: string): Promise<string> {
      console.log("[send-billing-emails] SMTP >", cmd.replace(/\r\n/g, "").substring(0, 50));
      await conn.write(encoder.encode(cmd + "\r\n"));
      const response = await readResponse();
      console.log("[send-billing-emails] SMTP <", response.substring(0, 100).replace(/\r\n/g, " "));
      return response;
    }
    
    // Ler saudação do servidor
    let response = await readResponse();
    console.log("[send-billing-emails] SMTP Greeting:", response.substring(0, 100));
    
    if (!response.startsWith("220")) {
      conn.close();
      return { success: false, error: "Servidor SMTP não respondeu corretamente" };
    }
    
    // EHLO
    response = await sendCommand(`EHLO localhost`);
    if (!response.startsWith("250")) {
      conn.close();
      return { success: false, error: "EHLO falhou" };
    }
    
    // AUTH LOGIN
    response = await sendCommand("AUTH LOGIN");
    if (!response.startsWith("334")) {
      conn.close();
      return { success: false, error: "AUTH LOGIN não suportado" };
    }
    
    // Enviar username (base64)
    response = await sendCommand(btoa(username));
    if (!response.startsWith("334")) {
      conn.close();
      return { success: false, error: "Username rejeitado" };
    }
    
    // Enviar password (base64)
    response = await sendCommand(btoa(password));
    if (!response.startsWith("235")) {
      conn.close();
      return { success: false, error: "Autenticação falhou - verifique usuário e senha" };
    }
    
    console.log("[send-billing-emails] Autenticação SMTP bem sucedida!");
    
    // MAIL FROM
    response = await sendCommand(`MAIL FROM:<${from}>`);
    if (!response.startsWith("250")) {
      conn.close();
      return { success: false, error: "MAIL FROM rejeitado" };
    }
    
    // RCPT TO (destinatário principal)
    response = await sendCommand(`RCPT TO:<${to}>`);
    if (!response.startsWith("250")) {
      conn.close();
      return { success: false, error: `Destinatário ${to} rejeitado` };
    }
    
    // RCPT TO (cópia)
    if (cc) {
      response = await sendCommand(`RCPT TO:<${cc}>`);
      if (!response.startsWith("250")) {
        console.log("[send-billing-emails] CC rejeitado, continuando sem cópia");
      }
    }
    
    // DATA
    response = await sendCommand("DATA");
    if (!response.startsWith("354")) {
      conn.close();
      return { success: false, error: "DATA rejeitado" };
    }
    
    // Construir e enviar email
    const mimeEmail = buildMimeEmail(from, fromName, to, cc, subject, textBody, attachments);
    await conn.write(encoder.encode(mimeEmail));
    await conn.write(encoder.encode("\r\n.\r\n"));
    
    response = await readResponse();
    console.log("[send-billing-emails] Resposta após DATA:", response.substring(0, 100));
    
    if (!response.startsWith("250")) {
      conn.close();
      return { success: false, error: "Email rejeitado pelo servidor" };
    }
    
    // QUIT
    await sendCommand("QUIT");
    conn.close();
    
    console.log("[send-billing-emails] Email enviado com sucesso!");
    return { success: true };
    
  } catch (error) {
    console.error("[send-billing-emails] Erro SMTP:", error);
    return { success: false, error: String(error) };
  }
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
  
  // Configurações SMTP
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
      url_guia_honorarios,
      guia_honorarios_id
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
  console.log("[send-billing-emails] guia_honorarios_id:", fat.guia_honorarios_id);
  console.log("[send-billing-emails] url_guia_autorizacao:", fat.url_guia_autorizacao);
  console.log("[send-billing-emails] url_descricao_cirurgica:", fat.url_descricao_cirurgica);
  console.log("[send-billing-emails] url_guia_honorarios:", fat.url_guia_honorarios);

  // 1.1) Buscar PDF da guia de honorários se existir guia_honorarios_id
  let pdfGuiaHonorarioPath: string | null = null;
  if (fat.guia_honorarios_id) {
    const { data: guiaHonorarios, error: guiaError } = await supabase
      .from("guia_honorarios")
      .select("pdf_guia_honorario")
      .eq("id", fat.guia_honorarios_id)
      .single();

    if (!guiaError && guiaHonorarios?.pdf_guia_honorario) {
      pdfGuiaHonorarioPath = guiaHonorarios.pdf_guia_honorario;
      console.log("[send-billing-emails] PDF da guia de honorários encontrado:", pdfGuiaHonorarioPath);
    } else {
      console.log("[send-billing-emails] Guia de honorários sem PDF ou erro:", guiaError);
    }
  }

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

  // 3) Preparar anexos
  const bucketName = "NPS-pro";
  const attachments: { filename: string; content: Uint8Array; contentType: string }[] = [];

  // Função para baixar arquivo
  async function downloadFile(path: string, filename: string): Promise<{ filename: string; content: Uint8Array; contentType: string } | null> {
    try {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(path, 60 * 60);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("[send-billing-emails] Erro ao criar URL assinada para:", path);
        return null;
      }

      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        console.error("[send-billing-emails] Erro ao baixar arquivo:", path);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const ext = path.split(".").pop()?.toLowerCase() || "";
      let contentType = "application/octet-stream";
      if (ext === "pdf") contentType = "application/pdf";
      else if (ext === "png") contentType = "image/png";
      else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";

      return { filename, content: uint8Array, contentType };
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
      if (attachment) attachments.push(attachment);
    }
  }

  // Processar descrição cirúrgica
  if (fat.url_descricao_cirurgica && fat.url_descricao_cirurgica.length > 0) {
    for (let i = 0; i < fat.url_descricao_cirurgica.length; i++) {
      const path = fat.url_descricao_cirurgica[i];
      const ext = path.split(".").pop()?.toLowerCase() || "pdf";
      const filename = `descricao_cirurgica_${i + 1}.${ext}`;
      const attachment = await downloadFile(path, filename);
      if (attachment) attachments.push(attachment);
    }
  }

  // Processar guia de honorários - primeiro do array url_guia_honorarios
  if (fat.url_guia_honorarios && fat.url_guia_honorarios.length > 0) {
    for (let i = 0; i < fat.url_guia_honorarios.length; i++) {
      const path = fat.url_guia_honorarios[i];
      const ext = path.split(".").pop()?.toLowerCase() || "pdf";
      const filename = `guia_honorarios_${i + 1}.${ext}`;
      console.log("[send-billing-emails] Processando guia honorários do array:", path);
      const attachment = await downloadFile(path, filename);
      if (attachment) attachments.push(attachment);
    }
  }

  // Processar PDF da guia de honorários da tabela guia_honorarios
  if (pdfGuiaHonorarioPath) {
    console.log("[send-billing-emails] Processando PDF da guia de honorários:", pdfGuiaHonorarioPath);
    const attachment = await downloadFile(pdfGuiaHonorarioPath, "guia_honorarios.pdf");
    if (attachment) {
      attachments.push(attachment);
      console.log("[send-billing-emails] PDF da guia de honorários adicionado aos anexos");
    } else {
      console.log("[send-billing-emails] Falha ao baixar PDF da guia de honorários");
    }
  }

  console.log("[send-billing-emails] Total de anexos preparados:", attachments.length);
  console.log("[send-billing-emails] Anexos:", attachments.map(a => a.filename));

  // 4) Preparar dados formatados
  const dataCirurgiaFormatada = formatarData(fat.data_cirurgia);
  const horaInicioFormatada = formatarHora(fat.hora_inicio);

  // 5) Enviar emails
  const emailsEnviados: string[] = [];
  const errosEnvio: string[] = [];

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

      const result = await sendEmailViaSMTP(
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpFrom,
        smtpFromName,
        clinicaCirurgia.email_contato_faturamento,
        userEmail,
        `[NÃO FATURAR] ${userName} - ${fat.paciente_nome || "Paciente"}`,
        emailNaoEnviar,
        attachments
      );

      if (result.success) {
        emailsEnviados.push(clinicaCirurgia.email_contato_faturamento);
      } else {
        errosEnvio.push(`Falha ao enviar para ${clinicaCirurgia.nome_fantasia}: ${result.error}`);
      }
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

    const result = await sendEmailViaSMTP(
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      smtpFromName,
      clinicaFat.email_contato_faturamento!,
      userEmail,
      `[FATURAMENTO] ${userName} - ${fat.paciente_nome || "Paciente"}`,
      emailEnviar,
      attachments
    );

    if (result.success) {
      emailsEnviados.push(clinicaFat.email_contato_faturamento!);
    } else {
      errosEnvio.push(`Falha ao enviar para ${clinicaFat.nome_fantasia}: ${result.error}`);
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

    const result = await sendEmailViaSMTP(
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      smtpFromName,
      clinicaFat.email_contato_faturamento!,
      userEmail,
      `[FATURAMENTO] ${userName} - ${fat.paciente_nome || "Paciente"}`,
      emailEnviar,
      attachments
    );

    if (result.success) {
      emailsEnviados.push(clinicaFat.email_contato_faturamento!);
    } else {
      errosEnvio.push(`Falha ao enviar para ${clinicaFat.nome_fantasia}: ${result.error}`);
    }
  }

  // 6) Atualizar status do faturamento
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
      console.error("[send-billing-emails] Erro ao atualizar status:", updateError);
    }
  }

  // 7) Retornar resultado
  const sucesso = emailsEnviados.length > 0;
  const mensagem = sucesso
    ? `Email(s) enviado(s) com sucesso para: ${emailsEnviados.join(", ")}`
    : `Nenhum email foi enviado. Erros: ${errosEnvio.join("; ")}`;

  console.log("[send-billing-emails] Resultado:", mensagem);

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