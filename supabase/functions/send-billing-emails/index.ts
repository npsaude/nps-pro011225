// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type Atuacao =
  | "CIRURGIAO"
  | "PRIMEIRO_AUXILIAR"
  | "SEGUNDO_AUXILIAR"
  | "TERCEIRO_AUXILIAR"
  | "ANESTESISTA";

interface RequestBody {
  faturamentoId: string;
  userEmail: string;
  userName: string;
  userCrm?: string | null;
  descricaoCirurgicaTexto?: string | null;
  atuacao?: Atuacao | null;
  dryRun?: boolean;
}

interface ClinicaData {
  id: string;
  nome_fantasia: string;
  contato: string | null;
  email_contato_faturamento: string | null;
  email_contato_faturamento_secundario: string | null;
}

interface ProcedimentoCirurgico {
  descricao_procedimento: string;
  codigo_procedimento: string;
  via_acesso?: string;
}

interface ItenFaturamento {
  id: string;
  codigo_procedimento: string | null;
  descricao_procedimento: string | null;
  quantidade_executada: number | null;
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

  cirurgiao_principal_nome: string | null;
  cirurgiao_principal_crm: string | null;
  auxiliar1_nome: string | null;
  auxiliar1_crm: string | null;
  auxiliar2_nome: string | null;
  auxiliar2_crm: string | null;
  auxiliar3_nome: string | null;
  auxiliar3_crm: string | null;
  anestesista_nome: string | null;
  anestesista_crm: string | null;
}

interface ModeloEmailRow {
  tipo: "FATURAR" | "NAO_FATURAR";
  assunto: string;
  corpo_html: string;
}

function isHtmlTemplate(content: string): boolean {
  const normalized = String(content ?? "").trim().toLowerCase();
  return normalized.includes("<!doctype") || normalized.includes("<html") || /<\/?[a-z][\s\S]*>/i.test(content);
}

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function convertPlainTextToEmailHtml(content: string): string {
  const normalized = String(content ?? "").replace(/\r\n/g, "\n").trim();
  const sections = normalized
    ? normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)
    : [];

  const paragraphs = sections.length
    ? sections
        .map((block) => {
          const lines = escapeHtml(block).split("\n");
          return `<p style="margin:0 0 16px;line-height:1.7;font-size:15px;color:#0f172a;">${lines.join("<br />")}</p>`;
        })
        .join("")
    : '<p style="margin:0;line-height:1.7;font-size:15px;color:#64748b;">Corpo do email vazio.</p>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email de faturamento</title>
  </head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
      <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#eff6ff,#f8fafc);">
        <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">
          Faturamento
        </div>
      </div>
      <div style="padding:24px;">
        ${paragraphs}
      </div>
    </div>
  </body>
</html>`;
}

type Attachment = { filename: string; content: Uint8Array; contentType: string };
type EncodedAttachment = { filename: string; contentType: string; base64: string };

function normalizeText(input: string): string {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDigits(input: string): string {
  return String(input ?? "").replace(/\D/g, "");
}

function cleanToken(token: string): string {
  return normalizeText(token).replace(/[^a-z0-9]/g, "");
}

function firstName(input: string): string {
  const parts = normalizeText(input).split(" ").filter(Boolean);
  if (parts.length === 0) return "";

  // remove títulos comuns (com ou sem pontuação)
  const first = cleanToken(parts[0]);
  if (first === "dr" || first === "dra" || first === "doutor" || first === "doutora") {
    return cleanToken(parts[1] ?? "");
  }

  return first;
}

function includesFirstName(haystack: string, fullName: string): boolean {
  const f = firstName(fullName);
  if (!f) return false;
  const text = ` ${normalizeText(haystack)} `;
  return text.includes(` ${f} `) || text.startsWith(`${f} `) || text.endsWith(` ${f}`);
}

function reconhecerAtuacao(params: {
  descricaoCirurgicaTexto: string | null | undefined;
  userNome: string;
  userCrm: string | null | undefined;
  cirurgiaoNome?: string | null;
  cirurgiaoCrm?: string | null;
  auxiliar1Nome?: string | null;
  auxiliar1Crm?: string | null;
  auxiliar2Nome?: string | null;
  auxiliar2Crm?: string | null;
  auxiliar3Nome?: string | null;
  auxiliar3Crm?: string | null;
  anestesistaNome?: string | null;
  anestesistaCrm?: string | null;
}): Atuacao | null {
  const crmUser = normalizeDigits(params.userCrm ?? "");
  const desc = params.descricaoCirurgicaTexto ?? "";

  const candidates: Array<{ atuacao: Atuacao; nome?: string | null; crm?: string | null }> = [
    { atuacao: "CIRURGIAO", nome: params.cirurgiaoNome, crm: params.cirurgiaoCrm },
    { atuacao: "PRIMEIRO_AUXILIAR", nome: params.auxiliar1Nome, crm: params.auxiliar1Crm },
    { atuacao: "SEGUNDO_AUXILIAR", nome: params.auxiliar2Nome, crm: params.auxiliar2Crm },
    { atuacao: "TERCEIRO_AUXILIAR", nome: params.auxiliar3Nome, crm: params.auxiliar3Crm },
    { atuacao: "ANESTESISTA", nome: params.anestesistaNome, crm: params.anestesistaCrm },
  ];

  // 1) Match forte por CRM nos campos extraídos (includes para lidar com sufixo de estado)
  if (crmUser) {
    for (const c of candidates) {
      const crm = normalizeDigits(c.crm ?? "");
      if (crm && (crm === crmUser || crm.includes(crmUser) || crmUser.includes(crm))) return c.atuacao;
    }
  }

  // 2) Fallback: primeiro nome + CRM no texto da descrição
  if (crmUser && includesFirstName(desc, params.userNome)) {
    const d = normalizeText(desc);
    if (d.includes(crmUser)) {
      const f = firstName(params.userNome);
      const patterns: Array<{ atuacao: Atuacao; re: RegExp }> = [
        { atuacao: "CIRURGIAO", re: new RegExp(`(cirurgi[aã]o|cirurgiao)[^\n]{0,120}${f}[^\n]{0,120}${crmUser}`) },
        { atuacao: "PRIMEIRO_AUXILIAR", re: new RegExp(`(1\s*o|1º|primeiro)\s*auxiliar[^\n]{0,120}${f}[^\n]{0,120}${crmUser}`) },
        { atuacao: "SEGUNDO_AUXILIAR", re: new RegExp(`(2\s*o|2º|segundo)\s*auxiliar[^\n]{0,120}${f}[^\n]{0,120}${crmUser}`) },
        { atuacao: "TERCEIRO_AUXILIAR", re: new RegExp(`(3\s*o|3º|terceiro)\s*auxiliar[^\n]{0,120}${f}[^\n]{0,120}${crmUser}`) },
        { atuacao: "ANESTESISTA", re: new RegExp(`anestesista[^\n]{0,120}${f}[^\n]{0,120}${crmUser}`) },
      ];
      for (const p of patterns) {
        if (p.re.test(d)) return p.atuacao;
      }
    }
  }

  // 3) Fallback simples: primeiro nome bate com o nome extraído
  const userFirst = firstName(params.userNome);
  if (userFirst) {
    for (const c of candidates) {
      const nomeFirst = firstName(c.nome ?? "");
      if (nomeFirst && nomeFirst === userFirst) return c.atuacao;
    }
  }

  // 4) Fallback: último nome ou qualquer palavra significativa do nome
  const userNomeNorm = normalizeText(params.userNome);
  if (userNomeNorm) {
    const userWords = userNomeNorm.split(" ").filter(w => w.length >= 4);
    for (const c of candidates) {
      if (!c.nome) continue;
      const candidateNorm = normalizeText(c.nome);
      // Check if any significant word from user name appears in candidate name
      for (const word of userWords) {
        if (candidateNorm.includes(word)) return c.atuacao;
      }
    }
  }

  return null;
}

function equipeBateComUsuario(params: {
  userNome: string;
  userCrm?: string | null;
  team: {
    cirurgiao_principal_nome: string | null;
    cirurgiao_principal_crm: string | null;
    auxiliar1_nome: string | null;
    auxiliar1_crm: string | null;
    auxiliar2_nome: string | null;
    auxiliar2_crm: string | null;
    auxiliar3_nome: string | null;
    auxiliar3_crm: string | null;
    anestesista_nome: string | null;
    anestesista_crm: string | null;
  };
}): boolean {
  const crmUser = normalizeDigits(params.userCrm ?? "");
  const fUser = firstName(params.userNome);
  if (!crmUser || !fUser) return false;

  const candidates = [
    { nome: params.team.cirurgiao_principal_nome, crm: params.team.cirurgiao_principal_crm },
    { nome: params.team.auxiliar1_nome, crm: params.team.auxiliar1_crm },
    { nome: params.team.auxiliar2_nome, crm: params.team.auxiliar2_crm },
    { nome: params.team.auxiliar3_nome, crm: params.team.auxiliar3_crm },
    { nome: params.team.anestesista_nome, crm: params.team.anestesista_crm },
  ];

  for (const c of candidates) {
    const crm = normalizeDigits(c.crm ?? "");
    const fn = firstName(c.nome ?? "");
    // CRM match (includes for state suffix) AND first name match
    const crmMatch = crm && (crm === crmUser || crm.includes(crmUser) || crmUser.includes(crm));
    if (crmMatch && fn && fn === fUser) return true;
    // Also match by CRM alone (without name) if CRM is exact
    if (crm && crm === crmUser) return true;
  }

  // Fallback: match by first name alone (if no CRM match found)
  if (fUser) {
    for (const c of candidates) {
      const fn = firstName(c.nome ?? "");
      if (fn && fn === fUser) return true;
    }
  }

  return false;
}

function atuacaoLabel(atuacao: Atuacao | null | undefined): string {
  switch (atuacao) {
    case "CIRURGIAO":
      return "Cirurgião";
    case "PRIMEIRO_AUXILIAR":
      return "Primeiro Auxiliar";
    case "SEGUNDO_AUXILIAR":
      return "Segundo Auxiliar";
    case "TERCEIRO_AUXILIAR":
      return "Terceiro Auxiliar";
    case "ANESTESISTA":
      return "Anestesista";
    default:
      return "";
  }
}

function formatarData(data: string | null): string {
  if (!data) return "";
  try {
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return data;
  }
}

function formatarHora(hora: string | null): string {
  if (!hora) return "";
  if (hora.includes(":")) {
    return hora.substring(0, 5);
  }
  return hora;
}

function uint8ArrayToBase64WithLineBreaks(uint8Array: Uint8Array): string {
  const base64 = base64Encode(uint8Array);
  const lines: string[] = [];
  for (let i = 0; i < base64.length; i += 76) {
    lines.push(base64.substring(i, i + 76));
  }
  return lines.join("\r\n");
}

function generateBoundary(): string {
  return "----=_Part_" + Math.random().toString(36).substring(2) + "_" + Date.now();
}

function buildMimeEmailEncoded(
  from: string,
  fromName: string,
  to: string,
  cc: string,
  subject: string,
  htmlBody: string,
  attachments: EncodedAttachment[],
): string {
  const boundary = generateBoundary();

  const encoder = new TextEncoder();
  const subjectBytes = encoder.encode(subject);
  const subjectBase64 = base64Encode(subjectBytes);

  let email = "";
  email += `From: ${fromName} <${from}>\r\n`;
  email += `To: ${to}\r\n`;
  if (cc) email += `Cc: ${cc}\r\n`;
  email += `Subject: =?UTF-8?B?${subjectBase64}?=\r\n`;
  email += `MIME-Version: 1.0\r\n`;
  email += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
  email += `\r\n`;

  // HTML
  email += `--${boundary}\r\n`;
  email += `Content-Type: text/html; charset=UTF-8\r\n`;
  email += `Content-Transfer-Encoding: base64\r\n`;
  email += `\r\n`;
  email += uint8ArrayToBase64WithLineBreaks(encoder.encode(htmlBody)) + `\r\n`;

  // attachments (já base64)
  for (const att of attachments) {
    email += `--${boundary}\r\n`;
    email += `Content-Type: ${att.contentType}; name="${att.filename}"\r\n`;
    email += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
    email += `Content-Transfer-Encoding: base64\r\n`;
    email += `\r\n`;
    email += att.base64 + `\r\n`;
  }

  email += `--${boundary}--\r\n`;
  return email;
}

function encodeAttachmentsOnce(attachments: Attachment[]): EncodedAttachment[] {
  console.log("[send-billing-emails] Base64 dos anexos (uma vez)...");
  return attachments.map((att) => ({
    filename: att.filename,
    contentType: att.contentType,
    base64: uint8ArrayToBase64WithLineBreaks(att.content),
  }));
}

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
  htmlBody: string,
  attachments: EncodedAttachment[],
): Promise<{ success: boolean; error?: string }> {
  console.log("[send-billing-emails] Iniciando conexão SMTP...");

  try {
    const conn = await Deno.connectTls({ hostname: host, port });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readResponse(): Promise<string> {
      const buffer = new Uint8Array(4096);
      const n = await conn.read(buffer);
      if (n === null) return "";
      return decoder.decode(buffer.subarray(0, n));
    }

    async function sendCommand(cmd: string): Promise<string> {
      console.log(
        "[send-billing-emails] SMTP >",
        cmd.replace(/\r\n/g, "").substring(0, 60),
      );
      await conn.write(encoder.encode(cmd + "\r\n"));
      const response = await readResponse();
      console.log(
        "[send-billing-emails] SMTP <",
        response.substring(0, 120).replace(/\r\n/g, " "),
      );
      return response;
    }

    let response = await readResponse();
    if (!response.startsWith("220")) {
      conn.close();
      return { success: false, error: "Servidor SMTP não respondeu corretamente" };
    }

    response = await sendCommand("EHLO localhost");
    if (!response.startsWith("250")) {
      conn.close();
      return { success: false, error: "EHLO falhou" };
    }

    response = await sendCommand("AUTH LOGIN");
    if (!response.startsWith("334")) {
      conn.close();
      return { success: false, error: "AUTH LOGIN não suportado" };
    }

    response = await sendCommand(base64Encode(encoder.encode(username)));
    if (!response.startsWith("334")) {
      conn.close();
      return { success: false, error: "Username rejeitado" };
    }

    response = await sendCommand(base64Encode(encoder.encode(password)));
    if (!response.startsWith("235")) {
      conn.close();
      return { success: false, error: "Autenticação falhou - verifique usuário e senha" };
    }

    response = await sendCommand(`MAIL FROM:<${from}>`);
    if (!response.startsWith("250")) {
      conn.close();
      return { success: false, error: "MAIL FROM rejeitado" };
    }

    response = await sendCommand(`RCPT TO:<${to}>`);
    if (!response.startsWith("250")) {
      conn.close();
      return { success: false, error: `Destinatário ${to} rejeitado` };
    }

    if (cc) {
      response = await sendCommand(`RCPT TO:<${cc}>`);
      if (!response.startsWith("250")) {
        console.log("[send-billing-emails] CC rejeitado, continuando sem cópia");
      }
    }

    response = await sendCommand("DATA");
    if (!response.startsWith("354")) {
      conn.close();
      return { success: false, error: "DATA rejeitado" };
    }

    const mimeEmail = buildMimeEmailEncoded(
      from,
      fromName,
      to,
      cc,
      subject,
      htmlBody,
      attachments,
    );

    const emailBytes = encoder.encode(mimeEmail);
    const chunkSize = 65536;
    for (let i = 0; i < emailBytes.length; i += chunkSize) {
      const chunk = emailBytes.subarray(i, Math.min(i + chunkSize, emailBytes.length));
      await conn.write(chunk);
    }

    await conn.write(encoder.encode("\r\n.\r\n"));

    response = await readResponse();
    if (!response.startsWith("250")) {
      conn.close();
      return { success: false, error: "Email rejeitado pelo servidor" };
    }

    await sendCommand("QUIT");
    conn.close();

    console.log("[send-billing-emails] Email enviado com sucesso!");
    return { success: true };
  } catch (error) {
    console.error("[send-billing-emails] Erro SMTP:", error);
    return { success: false, error: String(error) };
  }
}

function applyTemplate(input: string, vars: Record<string, string>): string {
  let out = input;
  for (const [key, value] of Object.entries(vars)) {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    out = out.replace(re, value);
  }
  return out;
}

function buildEmailBodyFromTemplate(input: string, vars: Record<string, string>): string {
  const rendered = applyTemplate(input, vars);
  if (isHtmlTemplate(rendered)) {
    return rendered;
  }
  return convertPlainTextToEmailHtml(rendered);
}

function getBillingRecipients(clinica: ClinicaData): string[] {
  return [
    clinica.email_contato_faturamento,
    clinica.email_contato_faturamento_secundario,
  ].filter((email, index, list): email is string => {
    if (!email) return false;
    return list.indexOf(email) === index;
  });
}

serve(async (req) => {
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  console.log("[send-billing-emails] Iniciando processamento...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "[send-billing-emails] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.",
    );
    return new Response(
      JSON.stringify({
        success: false,
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
    console.error("[send-billing-emails] Body JSON inválido.");
    return new Response(JSON.stringify({ success: false, error: "Body JSON inválido." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    faturamentoId,
    userEmail,
    userName,
    userCrm,
    descricaoCirurgicaTexto,
    atuacao,
    dryRun,
  } = body;

  if (!faturamentoId || !userEmail || !userName) {
    console.error("[send-billing-emails] Parâmetros obrigatórios faltando.");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Parâmetros obrigatórios: faturamentoId, userEmail e userName.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 1) Buscar dados do faturamento (inclui equipe para reconhecer atuação)
  const { data: faturamento, error: faturamentoError } = await supabase
    .from("faturamentos")
    .select(
      `
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
      guia_honorarios_id,
      cirurgiao_principal_nome,
      cirurgiao_principal_crm,
      auxiliar1_nome,
      auxiliar1_crm,
      auxiliar2_nome,
      auxiliar2_crm,
      auxiliar3_nome,
      auxiliar3_crm,
      anestesista_nome,
      anestesista_crm
    `,
    )
    .eq("id", faturamentoId)
    .single();

  if (faturamentoError || !faturamento) {
    console.error("[send-billing-emails] Erro ao buscar faturamento:", faturamentoError);
    return new Response(JSON.stringify({ success: false, error: "Faturamento não encontrado." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fat = faturamento as FaturamentoData;

  const team = {
    cirurgiao_principal_nome: fat.cirurgiao_principal_nome,
    cirurgiao_principal_crm: fat.cirurgiao_principal_crm,
    auxiliar1_nome: fat.auxiliar1_nome,
    auxiliar1_crm: fat.auxiliar1_crm,
    auxiliar2_nome: fat.auxiliar2_nome,
    auxiliar2_crm: fat.auxiliar2_crm,
    auxiliar3_nome: fat.auxiliar3_nome,
    auxiliar3_crm: fat.auxiliar3_crm,
    anestesista_nome: fat.anestesista_nome,
    anestesista_crm: fat.anestesista_crm,
  };

  const atuacaoReconhecida = reconhecerAtuacao({
    descricaoCirurgicaTexto,
    userNome: userName,
    userCrm: userCrm ?? null,
    cirurgiaoNome: fat.cirurgiao_principal_nome,
    cirurgiaoCrm: fat.cirurgiao_principal_crm,
    auxiliar1Nome: fat.auxiliar1_nome,
    auxiliar1Crm: fat.auxiliar1_crm,
    auxiliar2Nome: fat.auxiliar2_nome,
    auxiliar2Crm: fat.auxiliar2_crm,
    auxiliar3Nome: fat.auxiliar3_nome,
    auxiliar3Crm: fat.auxiliar3_crm,
    anestesistaNome: fat.anestesista_nome,
    anestesistaCrm: fat.anestesista_crm,
  });

  const atuacaoFinal: Atuacao | null = (atuacao ?? atuacaoReconhecida) as Atuacao | null;

  const requiresAtuacao = (fat.url_descricao_cirurgica?.length ?? 0) > 0;
  const bateEquipe = requiresAtuacao
    ? equipeBateComUsuario({ userNome: userName, userCrm: userCrm ?? null, team })
    : true;

  const atuacaoConfirmadaManualmente = atuacao !== null && typeof atuacao !== "undefined";

  if (dryRun) {
    return new Response(
      JSON.stringify({
        success: true,
        dry_run: true,
        atuacao_reconhecida: atuacaoReconhecida,
        atuacao_utilizada: atuacaoFinal,
        requires_atuacao: requiresAtuacao,
        bate_equipe: bateEquipe,
        warning:
          requiresAtuacao && !bateEquipe
            ? "Participação não confirmada por nome + CRM. Você ainda pode escolher manualmente sua atuação."
            : null,
        team,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Se precisa atuação, ela deve vir confirmada (selecionada) ou reconhecida.
  if (requiresAtuacao && !atuacaoFinal) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Confirme sua atuação na cirurgia antes de enviar.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Se não bateu com a equipe e o usuário NÃO confirmou manualmente, bloqueia.
  // Se confirmou manualmente (atuacao enviada), permite seguir.
  if (requiresAtuacao && !bateEquipe && !atuacaoConfirmadaManualmente) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "Não foi possível confirmar sua participação nesta cirurgia (nome + CRM não batem com a equipe). Se você realmente atuou, selecione sua atuação manualmente para continuar.",
        atuacao_reconhecida: atuacaoReconhecida,
        atuacao_utilizada: atuacaoFinal,
        requires_atuacao: requiresAtuacao,
        bate_equipe: bateEquipe,
        team,
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Persistir atuação confirmada no faturamento antes do envio (mesmo se o SMTP falhar)
  {
    const agora = new Date().toISOString();
    const { error: atuouComoError } = await supabase
      .from("faturamentos")
      .update({
        atuou_como: atuacaoFinal,
        updated_at: agora,
      })
      .eq("id", faturamentoId);

    if (atuouComoError) {
      console.error("[send-billing-emails] Erro ao salvar atuou_como:", atuouComoError);
    }
  }

  const smtpHost = Deno.env.get("SMTP_HOST") ?? "smtp.hostinger.com";
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") ?? "465");
  const smtpUser = Deno.env.get("SMTP_USER") ?? "";
  const smtpPass = Deno.env.get("SMTP_PASS") ?? "";
  const smtpFrom = Deno.env.get("SMTP_FROM") ?? smtpUser;
  const smtpFromName = Deno.env.get("SMTP_FROM_NAME") ?? "Conmedic";

  if (!smtpUser || !smtpPass) {
    console.error("[send-billing-emails] Configurações SMTP não encontradas.");
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "Configurações SMTP não encontradas. Configure os secrets SMTP_USER e SMTP_PASS no Supabase.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

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
    }
  }

  // 2) Buscar dados das instituições
  const instituicaoCirurgiaId = fat.instituicao_cirurgia_id;
  const instituicaoFaturamentoId = fat.instituicao_faturamento_id;

  if (!instituicaoFaturamentoId) {
    console.error("[send-billing-emails] Instituição de faturamento não definida.");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Instituição de faturamento não definida no faturamento.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 2.0) Buscar dados do usuário logado (public.usuarios_sistema) para preencher placeholders
  let usuarioNome = userName || "";
  let usuarioCrm = userCrm ?? "";

  try {
    const { data: usuarioSistema } = await supabase
      .from("usuarios_sistema")
      .select("nome, crm")
      .eq("email", userEmail)
      .maybeSingle();

    if (usuarioSistema?.nome) usuarioNome = String(usuarioSistema.nome);
    if (usuarioSistema?.crm) usuarioCrm = String(usuarioSistema.crm);
  } catch {
    // mantém fallback do body
  }

  const { data: clinicaFaturamento, error: clinicaFatError } = await supabase
    .from("clinicas")
    .select("id, nome_fantasia, contato, email_contato_faturamento, email_contato_faturamento_secundario")
    .eq("id", instituicaoFaturamentoId)
    .single();

  if (clinicaFatError || !clinicaFaturamento) {
    console.error(
      "[send-billing-emails] Erro ao buscar clínica de faturamento:",
      clinicaFatError,
    );
    return new Response(
      JSON.stringify({ success: false, error: "Instituição de faturamento não encontrada." }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const clinicaFat = clinicaFaturamento as ClinicaData;
  const clinicaFatRecipients = getBillingRecipients(clinicaFat);

  if (clinicaFatRecipients.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `A instituição "${clinicaFat.nome_fantasia}" não possui email de faturamento configurado.`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let clinicaCirurgia: ClinicaData | null = null;
  const instituicoesDiferentes =
    instituicaoCirurgiaId && instituicaoCirurgiaId !== instituicaoFaturamentoId;

  if (instituicoesDiferentes) {
    const { data: clinicaCir, error: clinicaCirError } = await supabase
      .from("clinicas")
      .select("id, nome_fantasia, contato, email_contato_faturamento, email_contato_faturamento_secundario")
      .eq("id", instituicaoCirurgiaId)
      .single();

    if (!clinicaCirError && clinicaCir) {
      clinicaCirurgia = clinicaCir as ClinicaData;
    }
  }

  // 3) Preparar anexos
  const bucketName = "NPS-pro";
  const attachments: Attachment[] = [];

  async function downloadFile(path: string, filename: string): Promise<Attachment | null> {
    try {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(path, 60 * 60);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("[send-billing-emails] Erro ao criar URL assinada:", path, signedUrlError);
        return null;
      }

      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        console.error("[send-billing-emails] Erro ao baixar arquivo:", path, response.status);
        return null;
      }

      const uint8Array = new Uint8Array(await response.arrayBuffer());

      const ext = path.split(".").pop()?.toLowerCase() || "";
      let contentType = "application/octet-stream";
      if (ext === "pdf") contentType = "application/pdf";
      else if (ext === "png") contentType = "image/png";
      else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
      else if (ext === "gif") contentType = "image/gif";
      else if (ext === "webp") contentType = "image/webp";

      return { filename, content: uint8Array, contentType };
    } catch (error) {
      console.error("[send-billing-emails] Erro ao processar arquivo:", path, error);
      return null;
    }
  }

  if (fat.url_guia_autorizacao?.length) {
    for (let i = 0; i < fat.url_guia_autorizacao.length; i++) {
      const path = fat.url_guia_autorizacao[i];
      const ext = path.split(".").pop()?.toLowerCase() || "pdf";
      const att = await downloadFile(path, `guia_autorizacao_${i + 1}.${ext}`);
      if (att) attachments.push(att);
    }
  }

  if (fat.url_descricao_cirurgica?.length) {
    for (let i = 0; i < fat.url_descricao_cirurgica.length; i++) {
      const path = fat.url_descricao_cirurgica[i];
      const ext = path.split(".").pop()?.toLowerCase() || "pdf";
      const att = await downloadFile(path, `descricao_cirurgica_${i + 1}.${ext}`);
      if (att) attachments.push(att);
    }
  }

  if (fat.url_guia_honorarios?.length) {
    for (let i = 0; i < fat.url_guia_honorarios.length; i++) {
      const path = fat.url_guia_honorarios[i];
      const ext = path.split(".").pop()?.toLowerCase() || "pdf";
      const att = await downloadFile(path, `guia_honorarios_${i + 1}.${ext}`);
      if (att) attachments.push(att);
    }
  }

  if (pdfGuiaHonorarioPath) {
    const att = await downloadFile(pdfGuiaHonorarioPath, "guia_honorarios.pdf");
    if (att) attachments.push(att);
  }

  const encodedAttachments = encodeAttachmentsOnce(attachments);

  // 4) Modelos de email
  const dataCirurgiaFormatada = formatarData(fat.data_cirurgia);
  const horaInicioFormatada = formatarHora(fat.hora_inicio);

  const { data: modelosEmail, error: modelosEmailError } = await supabase
    .from("modelos_email_faturamento")
    .select("tipo, assunto, corpo_html")
    .in("tipo", ["FATURAR", "NAO_FATURAR"]);

  if (modelosEmailError) {
    console.error("[send-billing-emails] Erro ao buscar modelos de email:", modelosEmailError);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Não foi possível carregar os modelos de email.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const templatesByType = new Map(
    ((modelosEmail ?? []) as ModeloEmailRow[]).map((m) => [m.tipo, m] as const),
  );

  const templateFaturar = templatesByType.get("FATURAR");
  const templateNaoFaturar = templatesByType.get("NAO_FATURAR");

  if (!templateFaturar || !templateNaoFaturar) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "Modelos de email não configurados (FATURAR e/ou NAO_FATURAR). Acesse Admin > Modelos de Emails.",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // 4.1) Buscar itens de faturamento para montar linhas da tabela de procedimentos cirúrgicos
  const { data: itensFaturamento } = await supabase
    .from("itens_faturamento")
    .select("id, codigo_procedimento, descricao_procedimento, quantidade_executada")
    .eq("faturamento_id", faturamentoId);

  const itens = (itensFaturamento ?? []) as ItenFaturamento[];

  console.log("[send-billing-emails] Itens de faturamento encontrados:", itens.length);

  const procedimentosRows = itens.length > 0
    ? itens.map((item) => `
        <tr>
          <td>${item.descricao_procedimento ?? ""}</td>
          <td style="text-align:center">${item.codigo_procedimento ?? ""}</td>
          <td style="text-align:center">${item.quantidade_executada ?? ""}</td>
          <td style="text-align:center"></td>
        </tr>
      `).join("")
    : '<tr><td colspan="4" style="text-align:center;color:#888;padding:4mm">Nenhum procedimento registrado</td></tr>';

  const commonVars = {
    paciente_nome: fat.paciente_nome || "N/A",
    convenio: fat.paciente_convenio || "N/A",
    data_cirurgia: dataCirurgiaFormatada || "N/A",
    hora_inicio: horaInicioFormatada || "N/A",
    hospital_nome: fat.hospital_nome || clinicaFat.nome_fantasia || "N/A",

    // compat
    nome_usuario: userName || "",

    // novos placeholders
    usuario_nome: usuarioNome || "",
    usuario_crm: usuarioCrm || "",

    atuou_como: atuacaoLabel(atuacaoFinal) || "",

    procedimentos_cirurgicos_rows: procedimentosRows,
  };

  // 5) Enviar emails
  const emailsEnviados: string[] = [];
  const errosEnvio: string[] = [];

  if (instituicoesDiferentes && clinicaCirurgia) {
    const clinicaCirurgiaRecipients = getBillingRecipients(clinicaCirurgia);

    // Email 1: instituição da cirurgia (NÃO faturar)
    if (clinicaCirurgiaRecipients.length > 0) {
      const vars = {
        ...commonVars,
        contato: clinicaCirurgia.contato || "Responsável",
        hospital_nome: fat.hospital_nome || clinicaCirurgia.nome_fantasia || "N/A",
      };

      const subject = applyTemplate(templateNaoFaturar.assunto, vars);
      const htmlBody = buildEmailBodyFromTemplate(templateNaoFaturar.corpo_html, vars);

      for (const recipient of clinicaCirurgiaRecipients) {
        const result = await sendEmailViaSMTP(
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpFrom,
          smtpFromName,
          recipient,
          userEmail,
          subject,
          htmlBody,
          encodedAttachments,
        );

        if (result.success) emailsEnviados.push(recipient);
        else errosEnvio.push(`Falha ao enviar para ${recipient} (${clinicaCirurgia.nome_fantasia}): ${result.error}`);
      }
    }

    // Email 2: instituição de faturamento (FATURAR)
    const varsFat = {
      ...commonVars,
      contato: clinicaFat.contato || "Responsável",
      hospital_nome: fat.hospital_nome || clinicaCirurgia?.nome_fantasia || "N/A",
    };

    const subjectFat = applyTemplate(templateFaturar.assunto, varsFat);
    const htmlBodyFat = buildEmailBodyFromTemplate(templateFaturar.corpo_html, varsFat);

    for (const recipient of clinicaFatRecipients) {
      const resultFat = await sendEmailViaSMTP(
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpFrom,
        smtpFromName,
        recipient,
        userEmail,
        subjectFat,
        htmlBodyFat,
        encodedAttachments,
      );

      if (resultFat.success) emailsEnviados.push(recipient);
      else errosEnvio.push(`Falha ao enviar para ${recipient} (${clinicaFat.nome_fantasia}): ${resultFat.error}`);
    }
  } else {
    // Email único (FATURAR)
    const varsFat = {
      ...commonVars,
      contato: clinicaFat.contato || "Responsável",
      hospital_nome: fat.hospital_nome || clinicaFat.nome_fantasia || "N/A",
    };

    const subjectFat = applyTemplate(templateFaturar.assunto, varsFat);
    const htmlBodyFat = buildEmailBodyFromTemplate(templateFaturar.corpo_html, varsFat);

    for (const recipient of clinicaFatRecipients) {
      const resultFat = await sendEmailViaSMTP(
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpFrom,
        smtpFromName,
        recipient,
        userEmail,
        subjectFat,
        htmlBodyFat,
        encodedAttachments,
      );

      if (resultFat.success) emailsEnviados.push(recipient);
      else errosEnvio.push(`Falha ao enviar para ${recipient} (${clinicaFat.nome_fantasia}): ${resultFat.error}`);
    }
  }

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
      anexos_count: encodedAttachments.length,
      atuacao_reconhecida: atuacaoReconhecida,
      atuacao_utilizada: atuacaoFinal,
    }),
    {
      status: sucesso ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});