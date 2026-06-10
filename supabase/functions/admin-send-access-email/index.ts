import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Admin utility: create auth user (if needed) and send password-reset email via Resend/SMTP.
 * POST body: { email: string, name?: string }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const userName = String(body?.name ?? email);
  // Mesmo destino usado pelo fluxo de reset do front (auth-service.ts).
  const redirectTo = "https://conmedic.com.br/reset-password";

  if (!email) {
    return new Response(JSON.stringify({ ok: false, error: "email required" }), { status: 400 });
  }

  console.log("[admin-send-access-email] start", { email });

  // 1) Check if user already exists
  let userAlreadyExists = false;
  try {
    const checkRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=1`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    );
    if (checkRes.ok) {
      const json = await checkRes.json();
      userAlreadyExists = (json?.users ?? []).some((u: any) => u.email?.toLowerCase() === email);
    }
  } catch (e: any) {
    console.error("[admin-send-access-email] existence check failed", { error: e?.message });
  }

  console.log("[admin-send-access-email] user existence", { email, userAlreadyExists });

  // 2) Create user if not exists (email_confirm: true so they can login after resetting password)
  if (!userAlreadyExists) {
    const tempPwd = `Tmp-${crypto.randomUUID()}`;
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPwd,
      email_confirm: true,
      user_metadata: { name: userName, role: "medico" },
    });

    if (createError) {
      const msg = String((createError as any)?.message ?? createError);
      const alreadyExists = msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered") || msg.toLowerCase().includes("exists");
      if (!alreadyExists) {
        console.error("[admin-send-access-email] createUser failed", { email, msg });
        return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 });
      }
    } else {
      console.log("[admin-send-access-email] user created", { email, userId: created?.user?.id });
    }
  }

  // 3) Send password-reset email via /auth/v1/recover (uses Resend SMTP template)
  const res = await fetch(`${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error("[admin-send-access-email] recover failed", { email, status: res.status, text });
    return new Response(JSON.stringify({ ok: false, error: "recover failed", status: res.status, body: text }), { status: 500 });
  }

  console.log("[admin-send-access-email] password-reset email sent", { email });

  // 4) Update enrollment metadata
  const authUserMeta = {
    attempted_at: new Date().toISOString(),
    status: "RECOVER_SENT",
    email_sent: true,
    method: "reset_password",
    redirect_to: redirectTo,
    user_already_existed: userAlreadyExists,
  };

  const { data: rows } = await supabase
    .from("subscription_enrollments")
    .select("id, metadata")
    .ilike("user_email", email)
    .eq("status", "ACTIVE");

  for (const row of rows ?? []) {
    await supabase
      .from("subscription_enrollments")
      .update({
        metadata: { ...(row.metadata ?? {}), auth_user: authUserMeta },
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }

  return new Response(
    JSON.stringify({ ok: true, email, status: "RECOVER_SENT", email_sent: true, user_already_existed: userAlreadyExists }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
