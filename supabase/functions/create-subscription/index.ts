import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function toDateYYYYMMDD(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function mapAsaasCycle(params: {
  billingInterval: string;
  intervalCount: number;
}) {
  const interval = (params.billingInterval || "MONTH").toUpperCase();
  const count = Number(params.intervalCount || 1);

  if (interval === "DAY") return count === 1 ? "DAILY" : "DAILY";
  if (interval === "WEEK") return count === 2 ? "BIWEEKLY" : "WEEKLY";

  if (interval === "YEAR") return "YEARLY";

  // MONTH (default)
  if (count === 2) return "BIMONTHLY";
  if (count === 3) return "QUARTERLY";
  if (count === 6) return "SEMIANNUALLY";
  if (count === 12) return "YEARLY";
  return "MONTHLY";
}

async function asaasPost<T>(params: {
  url: string;
  token: string;
  body: unknown;
}) {
  const res = await fetch(params.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: params.token,
    },
    body: JSON.stringify(params.body),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("[create-subscription] Asaas error", {
      status: res.status,
      url: params.url,
      body: params.body,
      response: json,
    });
    throw new Error(
      `Erro Asaas (${res.status}): ${JSON.stringify(json ?? {})}`,
    );
  }

  return json as T;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error("[create-subscription] Missing env vars", {
      hasUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(supabaseAnonKey),
      hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
    });
    return new Response("Server misconfigured", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    console.error("[create-subscription] Invalid auth", { userError });
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const authUser = userData.user;

  const { data: isSuperAdmin, error: isSuperAdminError } = await userClient.rpc(
    "is_super_admin",
    { p_user_id: authUser.id },
  );

  if (isSuperAdminError) {
    console.error("[create-subscription] is_super_admin rpc failed", {
      isSuperAdminError,
    });
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  if (!isSuperAdmin) {
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  const body = await req.json().catch(() => null);
  const plan_id = body?.plan_id as string | undefined;
  const user_name = body?.user_name as string | undefined;
  const user_email = body?.user_email as string | undefined;
  const user_phone = (body?.user_phone as string | undefined) ?? null;
  const payment_method =
    (body?.payment_method as string | undefined)?.toUpperCase() ?? "PIX";

  if (!plan_id || !user_name || !user_email) {
    return new Response(
      JSON.stringify({
        error: "Campos obrigatórios: plan_id, user_name, user_email",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: settings, error: settingsError } = await adminClient
    .from("app_settings")
    .select("asaas_token")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    console.error("[create-subscription] Failed to load app_settings", {
      settingsError,
    });
    return new Response("Failed to load settings", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const asaasToken = (settings as any)?.asaas_token as string | undefined;
  if (!asaasToken) {
    return new Response("Asaas token not configured", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { data: plan, error: planError } = await adminClient
    .from("subscription_plans")
    .select("*")
    .eq("id", plan_id)
    .single();

  if (planError || !plan) {
    console.error("[create-subscription] Plan not found", { planError, plan_id });
    return new Response("Plan not found", { status: 404, headers: corsHeaders });
  }

  const value = Number((plan as any).price_cents ?? 0) / 100;
  const cycle = mapAsaasCycle({
    billingInterval: String((plan as any).billing_interval ?? "MONTH"),
    intervalCount: Number((plan as any).interval_count ?? 1),
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  console.log("[create-subscription] Creating Asaas customer", {
    plan_id,
    user_email,
  });

  const customer = await asaasPost<{ id: string }>({
    url: "https://sandbox.asaas.com/api/v3/customers",
    token: asaasToken,
    body: {
      name: user_name,
      email: user_email,
      phone: user_phone,
      mobilePhone: user_phone,
    },
  });

  console.log("[create-subscription] Creating Asaas subscription", {
    customer_id: customer.id,
    cycle,
    value,
    payment_method,
  });

  const subscription = await asaasPost<{ id: string }>({
    url: "https://sandbox.asaas.com/api/v3/subscriptions",
    token: asaasToken,
    body: {
      customer: customer.id,
      billingType: payment_method,
      value,
      nextDueDate: toDateYYYYMMDD(tomorrow),
      cycle,
      description: (plan as any).name ?? "Assinatura",
    },
  });

  const { data: enrollment, error: enrollmentError } = await adminClient
    .from("subscription_enrollments")
    .insert({
      plan_id,
      asaas_subscription_id: subscription.id,
      asaas_customer_id: customer.id,
      user_name,
      user_email,
      user_phone,
      status: "PENDING",
      payment_method,
      created_by: authUser.id,
      metadata: {
        asaas: {
          subscription_id: subscription.id,
          customer_id: customer.id,
        },
      },
    })
    .select("*")
    .single();

  if (enrollmentError || !enrollment) {
    console.error("[create-subscription] Failed to insert enrollment", {
      enrollmentError,
    });
    return new Response("Failed to create enrollment", {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify(enrollment), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});