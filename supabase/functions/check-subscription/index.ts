import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function normalizeEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

/**
 * Normalizes a PostgreSQL timestamptz string to strict ISO 8601 so that
 * `new Date(...)` parses it reliably across all JS runtimes.
 *
 * Examples:
 *   "2026-04-10 21:00:00-03"   → "2026-04-10T21:00:00-03:00"
 *   "2026-04-10 21:00:00+00"   → "2026-04-10T21:00:00+00:00"
 *   "2026-04-10T21:00:00-03:00" → unchanged
 */
function toISOTimestamp(raw: string): string {
  // Replace first space between date and time with 'T'
  let s = raw.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");

  // Ensure timezone offset has a colon (e.g. -03 → -03:00)
  s = s.replace(/([+-]\d{2})$/, "$1:00");

  return s;
}

type EnrollmentRow = {
  id: string;
  user_email: string;
  status: string | null;
  cancelado: boolean | null;
  current_period_end: string | null;
  created_at: string;
};

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
    console.error("[check-subscription] Missing env vars", {
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
    console.error("[check-subscription] Invalid auth", { userError });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authEmail = normalizeEmail(userData.user.email ?? "");
  if (!authEmail) {
    console.warn("[check-subscription] User without email");
    return new Response(JSON.stringify({ valid: false, reason: "NO_EMAIL" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Filter directly in the database by email (case-insensitive) to avoid
  // missing records when there are more than 250 total enrollments.
  const { data: rows, error: rowsError } = await adminClient
    .from("subscription_enrollments")
    .select("id,user_email,status,cancelado,current_period_end,created_at")
    .ilike("user_email", authEmail)
    .order("current_period_end", { ascending: false });

  if (rowsError) {
    console.error("[check-subscription] Failed to load enrollments", {
      rowsError,
    });
    return new Response(JSON.stringify({ error: "Failed to load enrollments" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const mine = (rows ?? []) as EnrollmentRow[];

  console.log("[check-subscription] Loaded enrollments for user", {
    authEmail,
    count: mine.length,
    enrollments: mine.map((r) => ({ id: r.id, status: r.status, cancelado: r.cancelado, current_period_end: r.current_period_end })),
  });

  if (!mine.length) {
    return new Response(
      JSON.stringify({
        valid: false,
        reason: "NO_ENROLLMENT",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const nowMs = Date.now();

  // Se houver algum enrollment ativo/trial/pending não cancelado sem data de validade,
  // considera válido (cliente recém-criado pelo admin ainda sem data configurada).
  const pendingActive = mine.find(
    (r) =>
      !r.cancelado &&
      !r.current_period_end &&
      ["ACTIVE", "TRIAL", "PENDING"].includes(String(r.status ?? "").toUpperCase()),
  );

  if (pendingActive) {
    console.log("[check-subscription] Found active enrollment without period end (new client)", {
      authEmail,
      enrollmentId: pendingActive.id,
      status: pendingActive.status,
    });
    return new Response(
      JSON.stringify({
        valid: true,
        enrollment_id: pendingActive.id,
        current_period_end: null,
        status: pendingActive.status,
        cancelado: pendingActive.cancelado,
        reason: "PENDING_NO_END_DATE",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Find the enrollment with the furthest current_period_end that is still valid
  let best: EnrollmentRow | null = null;
  let bestEndMs = -Infinity;

  for (const r of mine) {
    if (!r.current_period_end) continue;
    const endMs = new Date(toISOTimestamp(r.current_period_end)).getTime();
    if (!Number.isFinite(endMs)) continue;

    if (endMs > bestEndMs) {
      bestEndMs = endMs;
      best = r;
    }
  }

  if (!best || !Number.isFinite(bestEndMs)) {
    console.warn("[check-subscription] No enrollment with valid current_period_end", {
      authEmail,
      enrollments: mine.map((r) => ({ id: r.id, status: r.status, current_period_end: r.current_period_end })),
    });
    return new Response(
      JSON.stringify({
        valid: false,
        reason: "NO_VALID_CURRENT_PERIOD_END",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log("[check-subscription] Best enrollment found", {
    authEmail,
    enrollmentId: best.id,
    status: best.status,
    current_period_end: best.current_period_end,
    current_period_end_iso: toISOTimestamp(best.current_period_end!),
    nowMs,
    bestEndMs,
    nowISO: new Date(nowMs).toISOString(),
    bestEndISO: new Date(bestEndMs).toISOString(),
    isValid: bestEndMs >= nowMs,
  });

  if (bestEndMs < nowMs) {
    return new Response(
      JSON.stringify({
        valid: false,
        reason: "EXPIRED",
        current_period_end: best.current_period_end,
        enrollment_id: best.id,
        status: best.status,
        cancelado: best.cancelado,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      valid: true,
      enrollment_id: best.id,
      current_period_end: best.current_period_end,
      status: best.status,
      cancelado: best.cancelado,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});