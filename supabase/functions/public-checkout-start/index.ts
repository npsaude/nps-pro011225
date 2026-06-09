import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ASAAS_BASE_URL = "https://api-sandbox.asaas.com/v3";

// Paginas de retorno do checkout Asaas no dominio de producao.
const CHECKOUT_RETURN_URL = "https://conmedic.com.br/boas-vindas";

function saoPauloTomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function normalizeBillingPeriod(value: string) {
  return value === "annual" ? "annual" : "monthly";
}

function asaasCycleForBillingPeriod(billingPeriod: "monthly" | "annual") {
  return billingPeriod === "annual" ? "YEARLY" : "MONTHLY";
}

function selectedPlanPrice(plan: { price_month: number | string; price_annual: number | string }, billingPeriod: "monthly" | "annual") {
  const rawPrice = billingPeriod === "annual" ? plan.price_annual : plan.price_month;
  const value = Number(rawPrice ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function asaasFetch(path: string, token: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("accept", "application/json");
  headers.set("Content-Type", "application/json");
  headers.set("access_token", token);
  return fetch(`${ASAAS_BASE_URL}${path}`, { ...init, headers });
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

function jsonErr(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

  // Registra erros do Asaas no banco para diagnostico (best-effort).
  async function logDebug(phase: string, status: number, errBody: unknown) {
    if (!supabase) return;
    try {
      await supabase.from("asaas_webhook_events").insert({
        event: "checkout_debug",
        process_error: `${phase} (${status})`,
        payload: { phase, status, error: errBody, callback_url: CHECKOUT_RETURN_URL },
        received_at: new Date().toISOString(),
      });
    } catch (_e) {
      // ignore
    }
  }

  try {
    const body = await req.json();

    const plan_id = String(body.plan_id ?? "");
    const billing_period = normalizeBillingPeriod(String(body.billing_period ?? "monthly"));
    const name = String(body.name ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "");
    const crm = String(body.crm ?? "");
    const state = String(body.state ?? "");
    const cpf_cnpj = String(body.cpf_cnpj ?? "").replace(/[^0-9]/g, "");

    if (!plan_id || !name || !email || !phone || !crm || !state || !cpf_cnpj) {
      return jsonErr({ error: "Campos obrigatorios ausentes." }, 400);
    }

    console.log("[public-checkout-start] start", { plan_id, billing_period });

    if (!supabase) {
      console.error("[public-checkout-start] missing supabase env");
      return jsonErr({ error: "Configuracao do Supabase incompleta (env vars ausentes)." }, 500);
    }

    const { data: settings, error: settingsError } = await supabase
      .from("app_settings")
      .select("asaas_token")
      .limit(1)
      .maybeSingle();

    if (settingsError) throw settingsError;

    const asaasToken = settings?.asaas_token;
    if (!asaasToken) {
      return jsonErr({ error: "Asaas token nao configurado em app_settings." }, 500);
    }

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id,name,description,price_month,price_annual,currency,billing_interval,interval_count,active")
      .eq("id", plan_id)
      .eq("active", true)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) return jsonErr({ error: "Plano invalido ou inativo." }, 400);

    const selectedPrice = selectedPlanPrice(plan, billing_period);
    if (selectedPrice <= 0) {
      console.error("[public-checkout-start] invalid plan price", { plan_id, billing_period, plan });
      return jsonErr({ error: "O valor do plano selecionado e invalido." }, 400);
    }

    const asaasCycle = asaasCycleForBillingPeriod(billing_period);
    const planDescription = `${plan.name} - ${billing_period === "annual" ? "Anual" : "Mensal"}`;

    const { data: existingLead, error: existingLeadError } = await supabase
      .from("site_leads")
      .select("id,status,activated_at")
      .eq("email", email)
      .maybeSingle();

    if (existingLeadError) throw existingLeadError;

    let lead_id: string;

    if (!existingLead) {
      const { data: createdLead, error: leadError } = await supabase
        .from("site_leads")
        .insert({
          name,
          email,
          phone,
          crm,
          state,
          status: "INACTIVE",
          metadata: { plan_id: plan.id, billing_period, cpf_cnpj },
        })
        .select("id")
        .single();

      if (leadError) throw leadError;
      lead_id = createdLead.id as string;
    } else {
      lead_id = existingLead.id as string;

      const { error: updLeadError } = await supabase
        .from("site_leads")
        .update({ name, phone, crm, state, metadata: { plan_id: plan.id, billing_period, cpf_cnpj } })
        .eq("id", lead_id);

      if (updLeadError) throw updLeadError;
    }

    const findCustomerRes = await asaasFetch(
      `/customers?email=${encodeURIComponent(email)}&limit=1`,
      asaasToken,
      { method: "GET" },
    );

    if (!findCustomerRes.ok) {
      const { json, text } = await readJsonSafe(findCustomerRes);
      console.error("[public-checkout-start] asaas find customer failed", { status: findCustomerRes.status, json, text });
      await logDebug("find_customer", findCustomerRes.status, json ?? text);
      return jsonErr({ error: "Asaas: erro ao consultar customer." }, 502);
    }

    const findCustomerJson = await findCustomerRes.json();
    const existingCustomerId =
      Array.isArray(findCustomerJson?.data) && findCustomerJson.data[0]?.id
        ? String(findCustomerJson.data[0].id)
        : null;

    let asaas_customer_id = existingCustomerId;

    if (!asaas_customer_id) {
      const createCustomerRes = await asaasFetch("/customers", asaasToken, {
        method: "POST",
        body: JSON.stringify({ name, email, mobilePhone: phone, cpfCnpj: cpf_cnpj }),
      });

      if (!createCustomerRes.ok) {
        const { json, text } = await readJsonSafe(createCustomerRes);
        console.error("[public-checkout-start] asaas create customer failed", { status: createCustomerRes.status, json, text });
        await logDebug("create_customer", createCustomerRes.status, json ?? text);
        return jsonErr({ error: "Asaas: erro ao criar customer." }, 502);
      }

      const createdCustomer = await createCustomerRes.json();
      if (!createdCustomer?.id) {
        console.error("[public-checkout-start] asaas create customer missing id", { createdCustomer });
        return jsonErr({ error: "Asaas: resposta invalida ao criar customer." }, 502);
      }
      asaas_customer_id = String(createdCustomer.id);
    } else {
      const updateCustomerRes = await asaasFetch(`/customers/${asaas_customer_id}`, asaasToken, {
        method: "POST",
        body: JSON.stringify({ name, mobilePhone: phone, cpfCnpj: cpf_cnpj }),
      });
      if (!updateCustomerRes.ok) {
        const { json, text } = await readJsonSafe(updateCustomerRes);
        console.error("[public-checkout-start] asaas update customer failed", { status: updateCustomerRes.status, json, text });
      }
    }

    const nextDueDate = saoPauloTomorrowISO();

    const subscriptionBody = (withCallback: boolean) => {
      const base: Record<string, unknown> = {
        customer: asaas_customer_id,
        billingType: "CREDIT_CARD",
        value: selectedPrice,
        cycle: asaasCycle,
        nextDueDate,
        description: planDescription,
        externalReference: lead_id,
      };
      if (withCallback) {
        base.callback = {
          successUrl: CHECKOUT_RETURN_URL,
          cancelUrl: CHECKOUT_RETURN_URL,
          expiredUrl: CHECKOUT_RETURN_URL,
          autoRedirect: true,
        };
      }
      return base;
    };

    // 1a tentativa: com callback (redirect pos-pagamento).
    let createSubscriptionRes = await asaasFetch("/subscriptions", asaasToken, {
      method: "POST",
      body: JSON.stringify(subscriptionBody(true)),
    });

    // Se falhar, registra o erro e tenta de novo SEM callback, para nao
    // bloquear o pagamento enquanto investigamos o motivo da recusa.
    if (!createSubscriptionRes.ok) {
      const first = await readJsonSafe(createSubscriptionRes);
      console.error("[public-checkout-start] subscription with callback failed", { status: createSubscriptionRes.status, body: first.json ?? first.text });
      await logDebug("create_subscription_with_callback", createSubscriptionRes.status, first.json ?? first.text);

      createSubscriptionRes = await asaasFetch("/subscriptions", asaasToken, {
        method: "POST",
        body: JSON.stringify(subscriptionBody(false)),
      });

      if (!createSubscriptionRes.ok) {
        const second = await readJsonSafe(createSubscriptionRes);
        console.error("[public-checkout-start] subscription without callback failed", { status: createSubscriptionRes.status, body: second.json ?? second.text });
        await logDebug("create_subscription_without_callback", createSubscriptionRes.status, second.json ?? second.text);
        return jsonErr(
          { error: "Asaas: erro ao criar assinatura.", asaas_status: createSubscriptionRes.status, asaas_error: second.json ?? second.text },
          502,
        );
      }
    }

    const subscription = await createSubscriptionRes.json();
    const asaas_subscription_id = String(subscription.id);

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("subscription_enrollments")
      .insert({
        plan_id: plan.id,
        asaas_customer_id,
        asaas_subscription_id,
        user_name: name,
        user_email: email,
        user_phone: phone,
        status: "PENDING",
        payment_method: subscription.billingType,
        metadata: {
          lead_id,
          billing_period,
          selected_price: selectedPrice,
          asaas_cycle: asaasCycle,
          plan_snapshot: plan,
          asaas_subscription: subscription,
        },

        created_by: null,
      })
      .select("id")
      .single();

    if (enrollmentError) throw enrollmentError;

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const paymentsRes = await asaasFetch(
      `/subscriptions/${encodeURIComponent(asaas_subscription_id)}/payments?limit=1`,
      asaasToken,
      { method: "GET" },
    );

    if (!paymentsRes.ok) {
      const { json, text } = await readJsonSafe(paymentsRes);
      console.error("[public-checkout-start] asaas list payments failed", { status: paymentsRes.status, json, text });
      await logDebug("list_payments", paymentsRes.status, json ?? text);
      return jsonErr({ error: "Asaas: erro ao buscar pagamento inicial." }, 502);
    }

    const paymentsJson = await paymentsRes.json();
    const firstPayment = Array.isArray(paymentsJson?.data) ? paymentsJson.data[0] : null;
    const redirect_url = String(firstPayment?.invoiceUrl ?? "");

    if (!redirect_url) {
      console.error("[public-checkout-start] missing invoiceUrl", { paymentsJson });
      return jsonErr({ error: "Nao foi possivel obter invoiceUrl do primeiro pagamento." }, 500);
    }

    console.log("[public-checkout-start] subscription created", {
      plan_id,
      billing_period,
      selectedPrice,
      asaasCycle,
      asaas_subscription_id,
      enrollment_id: enrollment.id,
    });

    return new Response(
      JSON.stringify({ redirect_url, enrollment_id: enrollment.id, lead_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[public-checkout-start] unhandled error", error);
    let message = "Erro desconhecido";
    try {
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === "object") {
        message = JSON.stringify(error, Object.getOwnPropertyNames(error));
      } else {
        message = String(error);
      }
    } catch (e) {
      message = "Erro fatal na serializacao do erro: " + String(e);
    }
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
