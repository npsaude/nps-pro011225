import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function asaasCancel(params: { token: string; subscriptionId: string }) {
  const res = await fetch(
    `https://sandbox.asaas.com/api/v3/subscriptions/${params.subscriptionId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        access_token: params.token,
      },
    },
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("[cancel-subscription] Asaas cancel failed", {
      status: res.status,
      subscriptionId: params.subscriptionId,
      response: json,
    });
    throw new Error(`Erro Asaas (${res.status}): ${JSON.stringify(json ?? {})}`);
  }

  return json;
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
    console.error("[cancel-subscription] Missing env vars", {
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
    console.error("[cancel-subscription] Invalid auth", { userError });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authUser = userData.user;
  const authEmail = (authUser.email ?? "").trim().toLowerCase();

  const body = await req.json().catch(() => null);
  const enrollment_id = body?.enrollment_id as string | undefined;

  if (!enrollment_id) {
    return new Response(JSON.stringify({ error: "Campo obrigatório: enrollment_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: settings, error: settingsError } = await adminClient
    .from("app_settings")
    .select("asaas_token")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    console.error("[cancel-subscription] Failed to load app_settings", {
      settingsError,
    });
    return new Response(JSON.stringify({ error: "Failed to load settings" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const asaasToken = (settings as any)?.asaas_token as string | undefined;
  if (!asaasToken) {
    return new Response(JSON.stringify({ error: "Asaas token not configured" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: enrollment, error: enrollmentError } = await adminClient
    .from("subscription_enrollments")
    .select("*")
    .eq("id", enrollment_id)
    .maybeSingle();

  if (enrollmentError) {
    console.error("[cancel-subscription] Failed to load enrollment", {
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

  if (!enrollmentEmail || enrollmentEmail !== authEmail) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const asaasSubscriptionId = (enrollment as any)
    ?.asaas_subscription_id as string | null;

  if (!asaasSubscriptionId) {
    return new Response(JSON.stringify({ error: "Enrollment without asaas_subscription_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[cancel-subscription] Canceling Asaas subscription", {
    enrollment_id,
    asaasSubscriptionId,
  });

  await asaasCancel({ token: asaasToken, subscriptionId: asaasSubscriptionId });

  const { data: updated, error: updateError } = await adminClient
    .from("subscription_enrollments")
    .update({
      status: "CANCELED",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", enrollment_id)
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("[cancel-subscription] Failed to update enrollment", {
      updateError,
    });
    return new Response(JSON.stringify({ error: "Failed to update enrollment" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, enrollment: updated }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});