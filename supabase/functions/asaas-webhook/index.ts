import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const ASAAS_BASE_URL = "https://api-sandbox.asaas.com/v3";
const RESET_PASSWORD_URL = "https://conmedic.com.br/reset-password";

type JsonRecord = Record<string, unknown>;

type AsaasPayment = {
  id?: string;
  customer?: string;
  subscription?: string;
  status?: string;
  billingType?: string;
  dueDate?: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  dateCreated?: string;
  value?: number;
  description?: string;
  externalReference?: string;
};

type AsaasSubscription = {
  id?: string;
  customer?: string;
  status?: string;
  billingType?: string;
  nextDueDate?: string;
  dateCreated?: string;
  value?: number;
  externalReference?: string;
};

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: AsaasPayment;
  subscription?: AsaasSubscription;
};

type EnrollmentRow = {
  id: string;
  user_name: string;
  user_email: string;
  status: string | null;
  cancelado: boolean;
  payment_method: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  started_at: string | null;
  ended_at: string | null;
  last_payment_at: string | null;
  metadata: unknown | null;
};

type AppSettingsRow = {
  asaas_token?: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asObject(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
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

function endOfDayIso(date: string | null | undefined) {
  const text = normalizeString(date);
  if (!text) return null;

  const parsed = new Date(`${text}T23:59:59.999Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function pickPaymentTimestamp(payment: AsaasPayment | undefined, fallbackIso: string) {
  const candidates = [
    payment?.clientPaymentDate,
    payment?.paymentDate,
    payment?.confirmedDate,
    payment?.dateCreated,
  ];

  for (const candidate of candidates) {
    const text = normalizeString(candidate);
    if (!text) continue;

    const parsed = text.includes("T") ? new Date(text) : new Date(`${text}T12:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return fallbackIso;
}

function mapSubscriptionStatusToLocal(status: unknown) {
  switch (normalizeUpper(status)) {
    case "ACTIVE":
      return { status: "ACTIVE", cancelado: false };
    case "INACTIVE":
      return { status: "PAUSED", cancelado: false };
    case "EXPIRED":
    case "CANCELED":
    case "DELETED":
      return { status: "CANCELED", cancelado: true };
    default:
      return null;
  }
}

function mapPaymentSignalToLocal(event: string | null, paymentStatus: string | null) {
  const normalizedEvent = normalizeUpper(event);
  const normalizedPaymentStatus = normalizeUpper(paymentStatus);

  if (
    normalizedEvent === "PAYMENT_RECEIVED" ||
    normalizedEvent === "PAYMENT_CONFIRMED" ||
    normalizedPaymentStatus === "RECEIVED" ||
    normalizedPaymentStatus === "CONFIRMED" ||
    normalizedPaymentStatus === "RECEIVED_IN_CASH"
  ) {
    return { status: "ACTIVE", cancelado: false };
  }

  if (
    normalizedEvent === "PAYMENT_OVERDUE" ||
    normalizedEvent === "PAYMENT_CHARGEBACK_REQUESTED" ||
    normalizedEvent === "PAYMENT_CHARGEBACK_DISPUTE" ||
    normalizedEvent === "PAYMENT_REFUNDED" ||
    normalizedPaymentStatus === "OVERDUE" ||
    normalizedPaymentStatus === "REFUNDED" ||
    normalizedPaymentStatus === "CHARGEBACK_REQUESTED" ||
    normalizedPaymentStatus === "CHARGEBACK_DISPUTE"
  ) {
    return { status: "FAILED", cancelado: false };
  }

  if (normalizedEvent?.startsWith("PAYMENT_")) {
    return { status: "PENDING", cancelado: false };
  }

  return null;
}

async function asaasGet<T>(params: { token: string; path: string }) {
  const response = await fetch(`${ASAAS_BASE_URL}${params.path}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      access_token: params.token,
    },
  });

  const json = await response.json().catch(() => null);

  if (response.status === 404) return null;

  if (!response.ok) {
    console.error("[asaas-webhook] Failed to fetch Asaas resource", {
      path: params.path,
      status: response.status,
      response: json,
    });
    throw new Error(`Erro Asaas (${response.status}) ao consultar recurso.`);
  }

  return json as T;
}

async function loadAppSettings(adminClient: ReturnType<typeof createClient>) {
  const { data, error } = await adminClient
    .from("app_settings")
    .select("asaas_token")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as AppSettingsRow | null;
}

async function validateWebhookOrigin(params: {
  webhookToken: string | null;
  headerToken: string | null;
  asaasToken: string | null;
  payment: AsaasPayment | undefined;
  subscription: AsaasSubscription | undefined;
}) {
  const { webhookToken, headerToken, asaasToken, payment, subscription } = params;

  if (webhookToken && headerToken === webhookToken) {
    return true;
  }

  if (!asaasToken) {
    console.warn("[asaas-webhook] Cannot validate webhook: Asaas token missing");
    return false;
  }

  const paymentId = normalizeString(payment?.id);
  if (paymentId) {
    const remotePayment = await asaasGet<AsaasPayment>({
      token: asaasToken,
      path: `/payments/${encodeURIComponent(paymentId)}`,
    });

    if (!remotePayment) return false;

    const remoteStatus = normalizeUpper(remotePayment.status);
    const remoteCustomer = normalizeString(remotePayment.customer);
    const remoteSubscription = normalizeString(remotePayment.subscription);

    const samePayment = normalizeString(remotePayment.id) === paymentId;
    const sameStatus = remoteStatus === normalizeUpper(payment?.status);
    const sameCustomer = remoteCustomer === normalizeString(payment?.customer);
    const sameSubscription = remoteSubscription === normalizeString(payment?.subscription);

    return Boolean(samePayment && sameStatus && sameCustomer && sameSubscription);
  }

  const subscriptionId = normalizeString(subscription?.id);
  if (subscriptionId) {
    const remoteSubscription = await asaasGet<AsaasSubscription>({
      token: asaasToken,
      path: `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    });

    if (!remoteSubscription) return false;

    return (
      normalizeString(remoteSubscription.id) === subscriptionId &&
      normalizeString(remoteSubscription.customer) === normalizeString(subscription?.customer)
    );
  }

  return false;
}

async function findEnrollment(params: {
  adminClient: ReturnType<typeof createClient>;
  subscriptionId: string | null;
  customerId: string | null;
  externalReference: string | null;
}) {
  const { adminClient, subscriptionId, customerId, externalReference } = params;

  // 1) Try by subscription ID (exact match)
  if (subscriptionId) {
    const { data, error } = await adminClient
      .from("subscription_enrollments")
      .select(
        "id,user_name,user_email,status,cancelado,payment_method,current_period_start,current_period_end,started_at,ended_at,last_payment_at,metadata",
      )
      .eq("asaas_subscription_id", subscriptionId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as EnrollmentRow;
  }

  // 2) Try by external reference (enrollment ID or lead ID stored in metadata)
  if (externalReference) {
    // externalReference may be the enrollment UUID itself
    const { data, error } = await adminClient
      .from("subscription_enrollments")
      .select(
        "id,user_name,user_email,status,cancelado,payment_method,current_period_start,current_period_end,started_at,ended_at,last_payment_at,metadata",
      )
      .eq("id", externalReference)
      .maybeSingle();

    if (error) {
      // May fail if externalReference is not a valid UUID — that's fine
      console.log("[asaas-webhook] externalReference lookup by id failed (may not be UUID)", { externalReference });
    } else if (data) {
      return data as EnrollmentRow;
    }
  }

  // 3) Fallback: by customer ID (most recent enrollment for this customer)
  if (customerId) {
    const { data, error } = await adminClient
      .from("subscription_enrollments")
      .select(
        "id,user_name,user_email,status,cancelado,payment_method,current_period_start,current_period_end,started_at,ended_at,last_payment_at,metadata,created_at",
      )
      .eq("asaas_customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    return ((data ?? [])[0] ?? null) as EnrollmentRow | null;
  }

  return null;
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
    console.log("[asaas-webhook] SMTP >", command.replace(/\r\n/g, " ").slice(0, 80));
    await conn.write(encoder.encode(command + "\r\n"));
    const response = await readResponse();
    console.log("[asaas-webhook] SMTP <", response.replace(/\r\n/g, " ").slice(0, 140));
    return response;
  }

  try {
    let response = await readResponse();
    if (!response.startsWith("220")) {
      throw new Error("Servidor SMTP não respondeu corretamente.");
    }

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
          Seu pagamento foi confirmado e seu acesso à Conmedic já está liberado.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
          Para definir sua senha de acesso, clique no botão abaixo:
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
  metadata: JsonRecord;
}) {
  const { adminClient, enrollment, metadata } = params;

  const normalizedEmail = normalizeEmail(enrollment.user_email);
  if (!normalizedEmail) {
    return { sent: false, metadataPatch: null };
  }

  const accessEmailMetadata = asObject(metadata.access_email);
  if (normalizeString(accessEmailMetadata.sent_at)) {
    return { sent: false, metadataPatch: accessEmailMetadata };
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

  let authUser = await findAuthUserByEmail(adminClient, normalizedEmail);

  if (!authUser) {
    const temporaryPassword = `${crypto.randomUUID()}A!9`;
    const { data, error } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        role: "MEDICO",
        nome: enrollment.user_name,
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
      authUser = await findAuthUserByEmail(adminClient, normalizedEmail);
    }
  }

  if (!authUser?.id) {
    throw new Error("Não foi possível localizar/criar o usuário no Auth após o pagamento confirmado.");
  }

  const { error: usuariosSistemaError } = await adminClient
    .from("usuarios_sistema")
    .upsert(
      {
        id_user: authUser.id,
        nome: enrollment.user_name,
        email: normalizedEmail,
        celular: null,
        regra: "MEDICO",
        ativo: true,
      },
      { onConflict: "id_user" },
    );

  if (usuariosSistemaError) {
    throw usuariosSistemaError;
  }

  const { error: medicoError } = await adminClient
    .from("medicos")
    .upsert(
      {
        id: authUser.id,
        nome: enrollment.user_name,
        email: normalizedEmail,
        telefone_whatsapp: null,
        crm: null,
        clinicas_ids: [],
        hospitais_ids: [],
      },
      { onConflict: "id" },
    );

  if (medicoError) {
    throw medicoError;
  }

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
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
      userName: enrollment.user_name,
      recoveryUrl,
    }),
  });

  return {
    sent: true,
    metadataPatch: {
      sent_at: new Date().toISOString(),
      type: "RECOVERY",
      email: normalizedEmail,
      auth_user_id: authUser.id,
    },
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
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[asaas-webhook] Missing Supabase env vars", {
      hasUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
    });
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const rawBody = await req.text();

  let payload: AsaasWebhookPayload;
  try {
    payload = JSON.parse(rawBody || "{}") as AsaasWebhookPayload;
  } catch (error) {
    console.error("[asaas-webhook] Invalid JSON payload", { error });
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  const eventName = normalizeUpper(payload.event);
  const providerEventId = normalizeString(payload.id);
  const payment = payload.payment;
  const subscription = payload.subscription;
  const subscriptionId = normalizeString(payment?.subscription) ?? normalizeString(subscription?.id);
  const customerId = normalizeString(payment?.customer) ?? normalizeString(subscription?.customer);
  const paymentId = normalizeString(payment?.id);
  const externalReference = normalizeString(payment?.externalReference) ?? normalizeString(subscription?.externalReference);

  console.log("[asaas-webhook] Received event", {
    eventName,
    providerEventId,
    subscriptionId,
    customerId,
    paymentId,
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  let eventRowId: string | null = null;

  const markEvent = async (params: {
    processed: boolean;
    processError?: string | null;
    enrollmentId?: string | null;
  }) => {
    if (!eventRowId) return;

    const { error } = await adminClient
      .from("asaas_webhook_events")
      .update({
        processed: params.processed,
        processed_at: params.processed ? new Date().toISOString() : null,
        process_error: params.processError ?? null,
        enrollment_id: params.enrollmentId ?? null,
      })
      .eq("id", eventRowId);

    if (error) {
      console.error("[asaas-webhook] Failed to update webhook event status", {
        error,
        eventRowId,
      });
    }
  };

  try {
    if (!eventName) {
      return jsonResponse({ error: "Evento não informado." }, 400);
    }

    const isSubscriptionEvent = eventName.startsWith("SUBSCRIPTION_");
    const isPaymentEvent = eventName.startsWith("PAYMENT_");

    if (!isSubscriptionEvent && !isPaymentEvent) {
      return jsonResponse({ ok: true, ignored: true }, 200);
    }

    const settings = await loadAppSettings(adminClient);
    const asaasToken = normalizeString(settings?.asaas_token);
    const webhookToken = normalizeString(Deno.env.get("ASAAS_WEBHOOK_TOKEN"));
    const headerToken = normalizeString(req.headers.get("asaas-access-token"));

    const validated = await validateWebhookOrigin({
      webhookToken,
      headerToken,
      asaasToken,
      payment,
      subscription,
    });

    if (!validated) {
      console.warn("[asaas-webhook] Unauthorized webhook", {
        eventName,
        providerEventId,
        hasHeaderToken: Boolean(headerToken),
        hasWebhookToken: Boolean(webhookToken),
      });
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (providerEventId) {
      const { data: existingEvent, error: existingEventError } = await adminClient
        .from("asaas_webhook_events")
        .select("id, processed")
        .eq("provider_event_id", providerEventId)
        .maybeSingle();

      if (existingEventError) {
        console.error("[asaas-webhook] Failed to check existing event", {
          existingEventError,
          providerEventId,
        });
        return jsonResponse({ error: "Failed to check event" }, 500);
      }

      if (existingEvent?.processed) {
        console.log("[asaas-webhook] Duplicate processed event ignored", {
          providerEventId,
          eventRowId: existingEvent.id,
        });
        return jsonResponse({ ok: true, duplicate: true }, 200);
      }
    }

    const { data: insertedEvent, error: insertEventError } = await adminClient
      .from("asaas_webhook_events")
      .insert({
        provider_event_id: providerEventId,
        event: eventName,
        subscription_id: subscriptionId,
        customer_id: customerId,
        external_reference: externalReference,
        payment_id: paymentId,
        payload,
        processed: false,
        process_error: null,
      })
      .select("id")
      .single();

    if (insertEventError) {
      const code = String((insertEventError as { code?: string }).code ?? "");

      if (code === "23505" && providerEventId) {
        const { data: duplicateEvent, error: duplicateEventError } = await adminClient
          .from("asaas_webhook_events")
          .select("id, processed")
          .eq("provider_event_id", providerEventId)
          .maybeSingle();

        if (duplicateEventError) {
          console.error("[asaas-webhook] Failed to load duplicate event", {
            duplicateEventError,
            providerEventId,
          });
          return jsonResponse({ error: "Failed to load duplicate event" }, 500);
        }

        if (duplicateEvent?.processed) {
          return jsonResponse({ ok: true, duplicate: true }, 200);
        }

        eventRowId = duplicateEvent?.id ?? null;
      } else {
        console.error("[asaas-webhook] Failed to store incoming event", {
          insertEventError,
          providerEventId,
        });
        return jsonResponse({ error: "Failed to store event" }, 500);
      }
    } else {
      eventRowId = insertedEvent.id;
    }

    if (!subscriptionId && !customerId) {
      await markEvent({
        processed: true,
        processError: "Evento sem subscription/customer para vinculação.",
      });
      return jsonResponse({ ok: true, ignored: true }, 200);
    }

    // Retry logic: the Asaas webhook may arrive before create-subscription
    // finishes inserting the enrollment row. We retry up to 3 times with delays.
    let enrollment: EnrollmentRow | null = null;
    const maxRetries = 3;
    const retryDelayMs = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      enrollment = await findEnrollment({
        adminClient,
        subscriptionId,
        customerId,
        externalReference,
      });

      if (enrollment) break;

      if (attempt < maxRetries) {
        console.log("[asaas-webhook] Enrollment not found, retrying...", {
          attempt,
          maxRetries,
          subscriptionId,
          customerId,
          externalReference,
        });
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    if (!enrollment) {
      const processError = `Enrollment não encontrado para subscription_id=${subscriptionId ?? "null"} customer_id=${customerId ?? "null"} externalReference=${externalReference ?? "null"} após ${maxRetries} tentativas.`;
      await markEvent({ processed: false, processError });
      return jsonResponse({ error: processError }, 404);
    }

    // If the enrollment was found by customer/externalReference but has a
    // different (or missing) asaas_subscription_id, update it so future
    // webhooks can match by subscription_id directly.
    if (subscriptionId) {
      const { data: enrollmentFull } = await adminClient
        .from("subscription_enrollments")
        .select("asaas_subscription_id")
        .eq("id", enrollment.id)
        .single();

      const currentSubId = normalizeString((enrollmentFull as any)?.asaas_subscription_id);

      if (currentSubId !== subscriptionId) {
        console.log("[asaas-webhook] Updating enrollment asaas_subscription_id", {
          enrollmentId: enrollment.id,
          oldSubscriptionId: currentSubId,
          newSubscriptionId: subscriptionId,
        });

        await adminClient
          .from("subscription_enrollments")
          .update({ asaas_subscription_id: subscriptionId })
          .eq("id", enrollment.id);
      }
    }

    const subscriptionDetails = subscriptionId && asaasToken
      ? await asaasGet<AsaasSubscription>({
          token: asaasToken,
          path: `/subscriptions/${encodeURIComponent(subscriptionId)}`,
        })
      : subscription ?? null;

    const nowIso = new Date().toISOString();
    const paymentSignal = mapPaymentSignalToLocal(eventName, payment?.status ?? null);
    const subscriptionSignal = mapSubscriptionStatusToLocal(subscriptionDetails?.status ?? subscription?.status ?? null);
    const effectiveSignal = subscriptionSignal ?? paymentSignal;

    const currentMetadata = asObject(enrollment.metadata);
    const currentAsaasMetadata = asObject(currentMetadata.asaas);

    const nextPeriodEnd =
      endOfDayIso(subscriptionDetails?.nextDueDate) ??
      endOfDayIso(payment?.dueDate) ??
      enrollment.current_period_end;

    const localStatus = effectiveSignal?.status ?? normalizeUpper(enrollment.status) ?? "PENDING";
    const cancelado = effectiveSignal?.cancelado ?? enrollment.cancelado;
    const paymentMethod =
      normalizeString(payment?.billingType) ??
      normalizeString(subscriptionDetails?.billingType) ??
      normalizeString(subscription?.billingType) ??
      enrollment.payment_method;

    const isPaymentSuccess = localStatus === "ACTIVE" && isPaymentEvent;
    const isCanceled = cancelado || localStatus === "CANCELED";
    const isPaused = localStatus === "PAUSED";

    let accessEmailPatch: JsonRecord | null = asObject(currentMetadata.access_email);

    if (isPaymentSuccess) {
      const accessEmailResult = await ensureAuthUserAndRecoveryEmail({
        adminClient,
        enrollment,
        metadata: currentMetadata,
      });
      accessEmailPatch = accessEmailResult.metadataPatch;
    }

    const nextMetadata = {
      ...currentMetadata,
      asaas: {
        ...currentAsaasMetadata,
        last_event: {
          id: providerEventId,
          event: eventName,
          received_at: nowIso,
        },
        last_payment: paymentId
          ? {
              id: paymentId,
              status: normalizeUpper(payment?.status),
              dueDate: normalizeString(payment?.dueDate),
              value: typeof payment?.value === "number" ? payment.value : null,
            }
          : currentAsaasMetadata.last_payment ?? null,
        subscription: {
          id: subscriptionId,
          customer_id: customerId,
          status: normalizeUpper(subscriptionDetails?.status ?? subscription?.status),
          next_due_date: normalizeString(subscriptionDetails?.nextDueDate),
        },
      },
      access_email: accessEmailPatch,
    };

    const updatePayload = {
      status: localStatus,
      cancelado: isCanceled,
      payment_method: paymentMethod,
      current_period_end: isCanceled ? enrollment.current_period_end : nextPeriodEnd,
      current_period_start:
        enrollment.current_period_start ??
        (isPaymentSuccess ? pickPaymentTimestamp(payment, nowIso) : nowIso),
      started_at:
        enrollment.started_at ??
        normalizeString(subscriptionDetails?.dateCreated) ??
        normalizeString(subscription?.dateCreated) ??
        (isPaymentSuccess ? pickPaymentTimestamp(payment, nowIso) : nowIso),
      ended_at: isCanceled ? nowIso : isPaused ? enrollment.ended_at : null,
      last_payment_at: isPaymentSuccess
        ? pickPaymentTimestamp(payment, nowIso)
        : enrollment.last_payment_at,
      updated_at: nowIso,
      metadata: nextMetadata,
    };

    const { error: updateError } = await adminClient
      .from("subscription_enrollments")
      .update(updatePayload)
      .eq("id", enrollment.id);

    if (updateError) {
      console.error("[asaas-webhook] Failed to update enrollment", {
        updateError,
        enrollmentId: enrollment.id,
        eventName,
      });
      await markEvent({
        processed: false,
        processError: updateError.message,
        enrollmentId: enrollment.id,
      });
      return jsonResponse({ error: "Failed to update enrollment" }, 500);
    }

    await markEvent({ processed: true, processError: null, enrollmentId: enrollment.id });

    console.log("[asaas-webhook] Enrollment synchronized", {
      enrollmentId: enrollment.id,
      eventName,
      localStatus,
      cancelado: isCanceled,
      current_period_end: updatePayload.current_period_end,
      last_payment_at: updatePayload.last_payment_at,
      accessEmailSent: Boolean(normalizeString(asObject(nextMetadata.access_email).sent_at)),
    });

    return jsonResponse({ ok: true, enrollment_id: enrollment.id, status: localStatus }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao processar webhook.";
    console.error("[asaas-webhook] Unexpected processing error", {
      error: message,
      eventRowId,
      eventName,
      providerEventId,
    });
    await markEvent({ processed: false, processError: message });
    return jsonResponse({ error: message }, 500);
  }
});