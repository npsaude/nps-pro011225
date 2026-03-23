import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const ASAAS_BASE_URL = "https://api-sandbox.asaas.com/v3";

type JsonRecord = Record<string, unknown>;

type AsaasPayment = {
  id?: string;
  customer?: string;
  subscription?: string;
  status?: string;
  billingType?: string;
  dueDate?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  dateCreated?: string;
  value?: number;
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
    payment?.dateCreated,
  ];

  for (const candidate of candidates) {
    const text = normalizeString(candidate);
    if (!text) continue;

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
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

async function asaasGetSubscription(params: {
  token: string;
  subscriptionId: string;
}) {
  const response = await fetch(
    `${ASAAS_BASE_URL}/subscriptions/${encodeURIComponent(params.subscriptionId)}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        access_token: params.token,
      },
    },
  );

  if (response.status === 404) {
    console.warn("[asaas-webhook] Subscription not found in Asaas", {
      subscriptionId: params.subscriptionId,
    });
    return null;
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("[asaas-webhook] Failed to fetch Asaas subscription", {
      status: response.status,
      subscriptionId: params.subscriptionId,
      response: json,
    });
    throw new Error(`Erro Asaas (${response.status}) ao consultar assinatura.`);
  }

  return (json ?? null) as AsaasSubscription | null;
}

async function findEnrollment(params: {
  adminClient: ReturnType<typeof createClient>;
  subscriptionId: string | null;
  customerId: string | null;
}) {
  const { adminClient, subscriptionId, customerId } = params;

  if (subscriptionId) {
    const { data, error } = await adminClient
      .from("subscription_enrollments")
      .select(
        "id,status,cancelado,payment_method,current_period_start,current_period_end,started_at,ended_at,last_payment_at,metadata",
      )
      .eq("asaas_subscription_id", subscriptionId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as EnrollmentRow;
  }

  if (customerId) {
    const { data, error } = await adminClient
      .from("subscription_enrollments")
      .select(
        "id,status,cancelado,payment_method,current_period_start,current_period_end,started_at,ended_at,last_payment_at,metadata,created_at",
      )
      .eq("asaas_customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    return ((data ?? [])[0] ?? null) as EnrollmentRow | null;
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  const headerToken = req.headers.get("asaas-access-token");

  if (!webhookToken) {
    console.error("[asaas-webhook] Missing ASAAS_WEBHOOK_TOKEN secret");
    return jsonResponse({ error: "Webhook secret not configured" }, 500);
  }

  if (!headerToken || headerToken !== webhookToken) {
    console.warn("[asaas-webhook] Invalid webhook token", {
      hasHeaderToken: Boolean(headerToken),
    });
    return jsonResponse({ error: "Unauthorized" }, 401);
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
  const subscriptionId =
    normalizeString(payment?.subscription) ?? normalizeString(subscription?.id);
  const customerId =
    normalizeString(payment?.customer) ?? normalizeString(subscription?.customer);
  const paymentId = normalizeString(payment?.id);
  const externalReference =
    normalizeString(payment?.externalReference) ??
    normalizeString(subscription?.externalReference);

  console.log("[asaas-webhook] Received event", {
    eventName,
    providerEventId,
    subscriptionId,
    customerId,
    paymentId,
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  let eventRowId: string | null = null;

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
        console.log("[asaas-webhook] Duplicate event already processed", {
          providerEventId,
          eventRowId: duplicateEvent.id,
        });
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
      await markEvent({ processed: true, processError: "Evento não informado." });
      return jsonResponse({ ok: true, ignored: true }, 200);
    }

    const isSubscriptionEvent = eventName.startsWith("SUBSCRIPTION_");
    const isPaymentEvent = eventName.startsWith("PAYMENT_");

    if (!isSubscriptionEvent && !isPaymentEvent) {
      console.log("[asaas-webhook] Unsupported event ignored", { eventName });
      await markEvent({ processed: true, processError: null });
      return jsonResponse({ ok: true, ignored: true }, 200);
    }

    if (!subscriptionId && !customerId) {
      console.warn("[asaas-webhook] Event without subscription/customer reference", {
        eventName,
        providerEventId,
      });
      await markEvent({
        processed: true,
        processError: "Evento sem subscription/customer para vinculação.",
      });
      return jsonResponse({ ok: true, ignored: true }, 200);
    }

    const enrollment = await findEnrollment({
      adminClient,
      subscriptionId,
      customerId,
    });

    if (!enrollment) {
      const processError = `Enrollment não encontrado para subscription_id=${subscriptionId ?? "null"} customer_id=${customerId ?? "null"}.`;
      console.warn("[asaas-webhook] Enrollment not found", {
        eventName,
        providerEventId,
        subscriptionId,
        customerId,
      });
      await markEvent({ processed: false, processError });
      return jsonResponse({ error: processError }, 404);
    }

    let asaasToken: string | null = null;
    if (subscriptionId) {
      const { data: settings, error: settingsError } = await adminClient
        .from("app_settings")
        .select("asaas_token")
        .limit(1)
        .maybeSingle();

      if (settingsError) {
        console.error("[asaas-webhook] Failed to load app settings", {
          settingsError,
        });
        await markEvent({
          processed: false,
          processError: "Falha ao carregar token Asaas do app_settings.",
          enrollmentId: enrollment.id,
        });
        return jsonResponse({ error: "Failed to load settings" }, 500);
      }

      asaasToken = normalizeString((settings as { asaas_token?: string } | null)?.asaas_token);
    }

    const subscriptionDetails = subscriptionId && asaasToken
      ? await asaasGetSubscription({ token: asaasToken, subscriptionId })
      : subscription ?? null;

    const nowIso = new Date().toISOString();
    const paymentSignal = mapPaymentSignalToLocal(eventName, payment?.status ?? null);
    const subscriptionSignal = mapSubscriptionStatusToLocal(subscriptionDetails?.status ?? subscription?.status ?? null);
    const effectiveSignal = subscriptionSignal ?? paymentSignal;

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

    const currentMetadata = asObject(enrollment.metadata);
    const currentAsaasMetadata = asObject(currentMetadata.asaas);

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
