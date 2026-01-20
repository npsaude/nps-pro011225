import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AsaasPayment = {
  id?: string;
  dueDate?: string;
  value?: number;
  status?: string;
  invoiceUrl?: string;
};

type RequestBody = {
  enrollment_id?: string;
};

async function asaasGet(params: { url: string; token: string }) {
  const res = await fetch(params.url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: params.token,
    },
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("[list-subscription-invoices] Asaas error", {
      status: res.status,
      url: params.url,
      response: json,
    });
    throw new Error(
      `Erro Asaas (${res.status}): ${JSON.stringify(json ?? {})}`,
    );
  }

  return json as { data?: AsaasPayment[] };
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
    console.error("[list-subscription-invoices] Missing env vars", {
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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    console.error("[list-subscription-invoices] Invalid auth", { userError });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authUser = userData.user;
  const authEmail = (authUser.email ?? "").trim().toLowerCase();

  const body = (await req.json().catch(() => null)) as RequestBody | null;
  const enrollmentId = body?.enrollment_id ?? null;

  if (!enrollmentId) {
    return new Response(JSON.stringify({ error: "Campo obrigatório: enrollment_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: isSuperAdmin, error: isSuperAdminError } = await userClient.rpc(
    "is_super_admin",
    { p_user_id: authUser.id },
  );

  if (isSuperAdminError) {
    console.error("[list-subscription-invoices] is_super_admin rpc failed", {
      isSuperAdminError,
    });
  }

  const { data: settings, error: settingsError } = await adminClient
    .from("app_settings")
    .select("asaas_token")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    console.error("[list-subscription-invoices] Failed to load app_settings", {
      settingsError,
    });
    return new Response(JSON.stringify({ error: "Failed to load settings" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const asaasToken = (settings as any)?.asaas_token as string | undefined;
  if (!asaasToken) {
    return new Response(
      JSON.stringify({ error: "Asaas token not configured" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: enrollment, error: enrollmentError } = await adminClient
    .from("subscription_enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (enrollmentError) {
    console.error("[list-subscription-invoices] Failed to load enrollment", {
      enrollmentError,
    });
    return new Response(JSON.stringify({ error: "Failed to load enrollment" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!enrollment) {
    return new Response(JSON.stringify({ error: "Enrollment not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const enrollmentEmail = String((enrollment as any).user_email ?? "")
    .trim()
    .toLowerCase();

  // Permite:
  // - o próprio assinante (email)
  // - super_admin (para suporte / operação)
  const canAccess = Boolean(isSuperAdmin) || (enrollmentEmail && enrollmentEmail === authEmail);

  if (!canAccess) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const asaasSubscriptionId = (enrollment as any)
    ?.asaas_subscription_id as string | null;

  if (!asaasSubscriptionId) {
    return new Response(
      JSON.stringify({ error: "Enrollment without asaas_subscription_id" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  console.log("[list-subscription-invoices] Listing payments", {
    enrollmentId,
    asaasSubscriptionId,
  });

  const url = `https://sandbox.asaas.com/api/v3/payments?subscription=${encodeURIComponent(
    asaasSubscriptionId,
  )}&limit=12&offset=0`;

  const res = await asaasGet({ url, token: asaasToken });

  const invoices = (res.data ?? []).map((p) => ({
    id: String(p.id ?? ""),
    dueDate: p.dueDate ?? null,
    value: typeof p.value === "number" ? p.value : null,
    status: p.status ?? null,
    invoiceUrl: p.invoiceUrl ?? null,
  }));

  return new Response(JSON.stringify({ invoices }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});