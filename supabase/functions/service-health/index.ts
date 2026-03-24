import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ServiceState = "ok" | "error";

type ServiceHealthItem = {
  status: ServiceState;
  message: string;
  checkedAt: string;
};

type HealthResponse = {
  webhookAsaas: ServiceHealthItem;
  ia: ServiceHealthItem;
  supabase: ServiceHealthItem;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ok(message: string): ServiceHealthItem {
  return {
    status: "ok",
    message,
    checkedAt: new Date().toISOString(),
  };
}

function error(message: string): ServiceHealthItem {
  return {
    status: "error",
    message,
    checkedAt: new Date().toISOString(),
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
    console.error("[service-health] Missing env vars", {
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
    console.error("[service-health] Invalid auth", { userError });
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { data: isSuperAdmin, error: isSuperAdminError } = await userClient.rpc(
    "is_super_admin",
    { p_user_id: userData.user.id },
  );

  if (isSuperAdminError || !isSuperAdmin) {
    console.error("[service-health] Forbidden", { isSuperAdminError });
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const response: HealthResponse = {
    webhookAsaas: error("Verificação não iniciada."),
    ia: error("Verificação não iniciada."),
    supabase: error("Verificação não iniciada."),
  };

  try {
    const { error: supabaseCheckError } = await adminClient
      .from("app_settings")
      .select("id", { head: true, count: "exact" });

    response.supabase = supabaseCheckError
      ? error(`Falha ao consultar o banco: ${supabaseCheckError.message}`)
      : ok("Conexão com banco e edge functions operando normalmente.");
  } catch (err) {
    response.supabase = error(
      `Falha ao validar Supabase: ${err instanceof Error ? err.message : "erro inesperado"}`,
    );
  }

  try {
    const { data: latestWebhook, error: webhookError } = await adminClient
      .from("asaas_webhook_events")
      .select("event, processed, process_error, received_at")
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (webhookError) {
      response.webhookAsaas = error(`Falha ao consultar webhook: ${webhookError.message}`);
    } else if (!latestWebhook) {
      response.webhookAsaas = error("Nenhum evento de webhook da Asaas foi recebido ainda.");
    } else if (latestWebhook.processed && !latestWebhook.process_error) {
      response.webhookAsaas = ok(
        `Último evento processado com sucesso: ${latestWebhook.event ?? "desconhecido"}.`,
      );
    } else {
      response.webhookAsaas = error(
        latestWebhook.process_error
          ? `Último evento falhou: ${latestWebhook.process_error}`
          : "Último evento de webhook ainda não foi processado com sucesso.",
      );
    }
  } catch (err) {
    response.webhookAsaas = error(
      `Falha ao validar webhook da Asaas: ${err instanceof Error ? err.message : "erro inesperado"}`,
    );
  }

  try {
    const { data: settings, error: settingsError } = await adminClient
      .from("app_settings")
      .select("openai_api_token, openai_model")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      response.ia = error(`Falha ao carregar configuração da IA: ${settingsError.message}`);
    } else {
      const openaiToken =
        (settings as any)?.openai_api_token ?? (settings as any)?.openaiApiToken ?? null;
      const openaiModel =
        (settings as any)?.openai_model ?? (settings as any)?.openaiModel ?? "gpt-4o";

      if (!openaiToken) {
        response.ia = error("Token da OpenAI não configurado.");
      } else {
        const openaiResp = await fetch(
          `https://api.openai.com/v1/models/${encodeURIComponent(String(openaiModel))}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${openaiToken}`,
            },
          },
        );

        if (!openaiResp.ok) {
          const openaiError = await openaiResp.text();
          response.ia = error(
            `Falha na OpenAI (${openaiResp.status}): ${openaiError || "sem detalhes"}`,
          );
        } else {
          response.ia = ok(`Modelo ${openaiModel} respondeu corretamente.`);
        }
      }
    }
  } catch (err) {
    response.ia = error(
      `Falha ao validar IA: ${err instanceof Error ? err.message : "erro inesperado"}`,
    );
  }

  return jsonResponse(response, 200);
});
