import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESET_PASSWORD_URL = "https://conmedic.com.br/reset-password";

type JsonRecord = Record<string, unknown>;

type EnrollmentRow = {
  id: string;
  user_name: string;
  user_email: string;
  status: string | null;
  cancelado: boolean;
  metadata: unknown | null;
};

type RequestBody = {
  enrollment_id?: string;
  force?: boolean;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeEmail(value: unknown) {
  const text = normalizeString(value);
  return text ? text.toLowerCase() : null;
}

function normalizeUpper(value: unknown) {
  const text = normalizeString(value);
  return text ? text.toUpperCase() : null;
}

function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function uint8ArrayToBase64WithLineBreaks(uint8Array: Uint8Array): string {
  const base64 = base64Encode(uint8Array);
  const lines: string[] = [];
  for (let index = 0; index < base64.length; index += 76) {
    lines.push(base64.substring(index, index + 76));
  }
  return lines.join("\r\n");
}

function buildMimeEmail(params: {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  htmlBody: string;
}) {
  const boundary = `----=_Part_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const encoder = new TextEncoder();
  const subjectBase64 = base64Encode(encoder.encode(params.subject));

  let email = "";
  email += `From: ${params.fromName} <${params.from}>\r\n`;
  email += `To: ${params.to}\r\n`;
  email += `Subject: =?UTF-8?B?${subjectBase64}?=\r\n`;
  email += `MIME-Version: 1.0\r\n`;
  email += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
  email += `\r\n`;
  email += `--${boundary}\r\n`;
  email += `Content-Type: text/html; charset=UTF-8\r\n`;
  email += `Content-Transfer-Encoding: base64\r\n`;
  email += `\r\n`;
  email += uint8ArrayToBase64WithLineBreaks(encoder.encode(params.htmlBody)) + `\r\n`;
  email += `--${boundary}--\r\n`;

  return email;
}

async function sendEmailViaSMTP(params: {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  htmlBody: string;
}) {
  const conn = await Deno.connectTls({ hostname: params.host, port: params.port });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse() {
    const buffer = new Uint8Array(4096);
    const read = await conn.read(buffer);
    if (read === null) return "";
    return decoder.decode(buffer.subarray(0, read));
  }

  async function sendCommand(command: string) {
    console.log("[send-subscription-access-email] SMTP >", command.replace(/\r\n/g, " ").slice(0, 80));
    await conn.write(encoder.encode(command + "\r\n"));
    const response = await readResponse();
    console.log("[send-subscription-access-email] SMTP <", response.replace(/\r\n/g, " ").slice(0, 140));
    return response;
  }

  try {
    let response = await readResponse();
    if (!response.startsWith("220")) throw new Error("Servidor SMTP não respondeu corretamente.");

    response = await sendCommand("EHLO localhost");
    if (!response.startsWith("250")) throw new Error("EHLO falhou.");

    response = await sendCommand("AUTH LOGIN");
    if (!response.startsWith("334")) throw new Error("AUTH LOGIN não suportado.");

    response = await sendCommand(base64Encode(encoder.encode(params.username)));
    if (!response.startsWith("334")) throw new Error("Usuário SMTP rejeitado.");

    response = await sendCommand(base64Encode(encoder.encode(params.password)));
    if (!response.startsWith("235")) throw new Error("Autenticação SMTP falhou.");

    response = await sendCommand(`MAIL FROM:<${params.from}>`);
    if (!response.startsWith("250")) throw new Error("MAIL FROM rejeitado.");

    response = await sendCommand(`RCPT TO:<${params.to}>`);
    if (!response.startsWith("250")) throw new Error(`Destinatário ${params.to} rejeitado.`);

    response = await sendCommand("DATA");
    if (!response.startsWith("354")) throw new Error("DATA rejeitado.");

    const mimeEmail = buildMimeEmail(params);
    await conn.write(encoder.encode(mimeEmail));
    await conn.write(encoder.encode("\r\n.\r\n"));

    response = await readResponse();
    if (!response.startsWith("250")) throw new Error("Envio SMTP não confirmado.");

    await sendCommand("QUIT");
  } finally {
    conn.close();
  }
}

function buildRecoveryEmailHtml(params: { userName: string; recoveryUrl: string }) {
  const firstName = normalizeString(params.userName)?.split(" ")[0] ?? "cliente";
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f7f8fc;padding:32px;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;padding:32px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 12px;font-size:16px;">Olá, ${firstName}.</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
          Seu acesso à Conmedic já está liberado.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
          Para criar ou redefinir sua senha, clique no botão abaixo:
        </p>
        <p style="margin:0 0 24px;">
          <a href="${params.recoveryUrl}" style="display:inline-block;background:#112a66;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700;">
            Criar / redefinir minha senha
          </a>
        </p>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
          Se o botão não funcionar, copie e cole este link no navegador:
        </p>
        <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;color:#334155;">
          ${params.recoveryUrl}
        </p>
      </div>
    </div>
  `;
}

function extractRecoveryLink(data: unknown) {
  const obj = asObject(data);
  const properties = asObject(obj.properties);

  return (
    normalizeString(properties.action_link) ??
    normalizeString(obj.action_link) ??
    normalizeString(obj.actionLink) ??
    normalizeString(obj.url)
  );
}

async function findAuthUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw error;

    const user = (data.users ?? []).find(
      (item) => normalizeEmail(item.email) === normalizedEmail,
    );

    if (user) return user;
    if ((data.users ?? []).length < 200) break;
  }

  return null;
}

async function ensureAuthUserAndRecoveryEmail(params: {
  adminClient: ReturnType<typeof createClient>;
  enrollment: EnrollmentRow;
}) {
  const normalizedEmail = normalizeEmail(params.enrollment.user_email);
  if (!normalizedEmail) {
    throw new Error("E-mail do assinante não informado.");
  }

  const smtpHost = Deno.env.get("SMTP_HOST") ?? "smtp.hostinger.com";
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") ?? "465");
  const smtpUser = Deno.env.get("SMTP_USER") ?? "";
  const smtpPass = Deno.env.get("SMTP_PASS") ?? "";
  const smtpFrom = Deno.env.get("SMTP_FROM") ?? smtpUser;
  const smtpFromName = Deno.env.get("SMTP_FROM_NAME") ?? "Conmedic";

  if (!smtpUser || !smtpPass) {
    throw new Error("Configurações SMTP não encontradas para envio do e-mail de acesso.");
  }

  let authUser = await findAuthUserByEmail(params.adminClient, normalizedEmail);

  if (!authUser) {
    const temporaryPassword = `${crypto.randomUUID()}A!9`;
    const { data, error } = await params.adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        role: "MEDICO",
        nome: params.enrollment.user_name,
      },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (!message.includes("already") && !message.includes("registered")) {
        throw error;
      }
    } else {
      authUser = data.user;
    }

    if (!authUser) {
      authUser = await findAuthUserByEmail(params.adminClient, normalizedEmail);
    }
  }

  if (!authUser?.id) {
    throw new Error("Não foi possível localizar/criar o usuário no Auth.");
  }

  if (!authUser.email_confirmed_at) {
    const { error } = await params.adminClient.auth.admin.updateUserById(authUser.id, {
      email_confirm: true,
      user_metadata: {
        role: "MEDICO",
        nome: params.enrollment.user_name,
      },
    });

    if (error) throw error;
  }

  const { error: usuariosSistemaError } = await params.adminClient
    .from("usuarios_sistema")
    .upsert(
      {
        id_user: authUser.id,
        nome: params.enrollment.user_name,
        email: normalizedEmail,
        celular: null,
        regra: "MEDICO",
        ativo: true,
      },
      { onConflict: "id_user" },
    );

  if (usuariosSistemaError) throw usuariosSistemaError;

  const { error: medicoError } = await params.adminClient
    .from("medicos")
    .upsert(
      {
        id: authUser.id,
        nome: params.enrollment.user_name,
        email: normalizedEmail,
        telefone_whatsapp: null,
        crm: null,
        clinicas_ids: [],
        hospitais_ids: [],
      },
      { onConflict: "id" },
    );

  if (medicoError) throw medicoError;

  const { data: linkData, error: linkError } = await params.adminClient.auth.admin.generateLink({
    type: "recovery",
    email: normalizedEmail,
    options: {
      redirectTo: RESET_PASSWORD_URL,
    },
  });

  if (linkError) throw linkError;

  const recoveryUrl = extractRecoveryLink(linkData);
  if (!recoveryUrl) {
    throw new Error("Não foi possível gerar o link de recuperação de senha.");
  }

  await sendEmailViaSMTP({
    host: smtpHost,
    port: smtpPort,
    username: smtpUser,
    password: smtpPass,
    from: smtpFrom,
    fromName: smtpFromName,
    to: normalizedEmail,
    subject: "Seu acesso à Conmedic foi liberado",
    htmlBody: buildRecoveryEmailHtml({
      userName: params.enrollment.user_name,
      recoveryUrl,
    }),
  });

  return {
    auth_user_id: authUser.id,
    sent_at: new Date().toISOString(),
    type: "RECOVERY",
    email: normalizedEmail,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error("[send-subscription-access-email] Missing env vars", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
      hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
    });
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    console.error("[send-subscription-access-email] Invalid auth", { userError });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { data: isSuperAdmin, error: isSuperAdminError } = await userClient.rpc(
    "is_super_admin",
    { p_user_id: userData.user.id },
  );

  if (isSuperAdminError || !isSuperAdmin) {
    console.error("[send-subscription-access-email] Forbidden", { isSuperAdminError });
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const body = (await req.json().catch(() => null)) as RequestBody | null;
  const enrollmentId = normalizeString(body?.enrollment_id);
  const force = Boolean(body?.force);

  if (!enrollmentId) {
    return jsonResponse({ error: "Campo obrigatório: enrollment_id" }, 400);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: enrollment, error: enrollmentError } = await adminClient
    .from("subscription_enrollments")
    .select("id,user_name,user_email,status,cancelado,metadata")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (enrollmentError) {
    console.error("[send-subscription-access-email] Failed to load enrollment", { enrollmentError });
    return jsonResponse({ error: "Failed to load enrollment" }, 500);
  }

  if (!enrollment) {
    return jsonResponse({ error: "Enrollment not found" }, 404);
  }

  if (Boolean(enrollment.cancelado)) {
    return jsonResponse({ error: "Assinatura cancelada. Não é possível enviar acesso." }, 400);
  }

  const enrollmentStatus = normalizeUpper(enrollment.status);
  if (!["ACTIVE", "TRIAL", "PENDING"].includes(enrollmentStatus ?? "")) {
    return jsonResponse({ error: "Assinatura sem status válido para envio de acesso." }, 400);
  }

  const metadata = asObject(enrollment.metadata);
  const accessEmailMetadata = asObject(metadata.access_email);

  if (!force && normalizeString(accessEmailMetadata.sent_at)) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "ACCESS_EMAIL_ALREADY_SENT",
      enrollment,
    });
  }

  try {
    const accessEmailPatch = await ensureAuthUserAndRecoveryEmail({
      adminClient,
      enrollment: enrollment as EnrollmentRow,
    });

    const nextMetadata = {
      ...metadata,
      access_email: accessEmailPatch,
    };

    const { data: updatedEnrollment, error: updateError } = await adminClient
      .from("subscription_enrollments")
      .update({
        metadata: nextMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", enrollmentId)
      .select("*")
      .single();

    if (updateError || !updatedEnrollment) {
      console.error("[send-subscription-access-email] Failed to update enrollment metadata", {
        updateError,
        enrollmentId,
      });
      return jsonResponse({ error: "Failed to update enrollment" }, 500);
    }

    console.log("[send-subscription-access-email] Access email sent", {
      enrollmentId,
      email: enrollment.user_email,
      force,
    });

    return jsonResponse({ ok: true, enrollment: updatedEnrollment }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao enviar acesso.";
    console.error("[send-subscription-access-email] Unexpected error", {
      error: message,
      enrollmentId,
      force,
    });
    return jsonResponse({ error: message }, 500);
  }
});
