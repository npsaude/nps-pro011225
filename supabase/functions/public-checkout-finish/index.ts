import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Finaliza o checkout público logo após o pagamento.
 *
 * Recebe os identificadores que o Asaas anexa na URL do redirect (paymentId /
 * id / subscription / etc.), valida no Asaas se o pagamento foi CONFIRMADO,
 * descobre o e-mail do cliente, garante que o usuário existe no Auth e devolve
 * um token de uso único (magiclink) para a tela /boas-vindas autenticar o
 * cliente e deixá-lo criar a senha.
 *
 * Importante: só gera o token quando há um pagamento efetivamente confirmado.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASAAS_BASE_URL = "https://api-sandbox.asaas.com/v3";
const PAID_STATUSES = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"];

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function asaasGet(path: string, token: string) {
  return fetch(`${ASAAS_BASE_URL}${path}`, {
    method: "GET",
    headers: { access_token: token, accept: "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // O front manda todos os valores de query params do redirect; tentamos
    // cada um como id de pagamento (pay_...) ou de assinatura (sub_...).
    const raw: string[] = [];
    if (body?.paymentId) raw.push(String(body.paymentId));
    if (Array.isArray(body?.candidates)) for (const c of body.candidates) raw.push(String(c));

    const candidates = Array.from(
      new Set(
        raw
          .map((c) => c.trim())
          .filter((c) => /^pay_[A-Za-z0-9]+$/.test(c) || /^sub_[A-Za-z0-9]+$/.test(c)),
      ),
    ).slice(0, 10);

    if (candidates.length === 0) {
      return jsonRes({ ok: false, code: "no_reference", error: "Sem referência de pagamento na URL." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: settings } = await supabase
      .from("app_settings")
      .select("asaas_token")
      .limit(1)
      .maybeSingle();

    const asaasToken = (settings as any)?.asaas_token as string | undefined;
    if (!asaasToken) {
      return jsonRes({ ok: false, error: "Asaas token não configurado." }, 500);
    }

    // Localiza um pagamento confirmado a partir dos candidatos.
    let payment: any = null;
    let sawPending = false;

    for (const id of candidates) {
      if (id.startsWith("pay_")) {
        const r = await asaasGet(`/payments/${encodeURIComponent(id)}`, asaasToken);
        if (r.ok) {
          const p = await r.json();
          if (p?.id) {
            if (PAID_STATUSES.includes(String(p.status))) { payment = p; break; }
            sawPending = true;
          }
        }
      } else if (id.startsWith("sub_")) {
        const r = await asaasGet(`/subscriptions/${encodeURIComponent(id)}/payments?limit=10`, asaasToken);
        if (r.ok) {
          const j = await r.json();
          const list = Array.isArray(j?.data) ? j.data : [];
          const paid = list.find((p: any) => PAID_STATUSES.includes(String(p.status)));
          if (paid) { payment = paid; break; }
          if (list.length > 0) sawPending = true;
        }
      }
    }

    if (!payment) {
      return jsonRes(
        {
          ok: false,
          code: sawPending ? "payment_not_paid" : "payment_not_found",
          error: sawPending
            ? "Pagamento ainda não confirmado pelo Asaas."
            : "Pagamento não localizado.",
        },
        sawPending ? 409 : 404,
      );
    }

    // Descobre o e-mail do cliente: assinatura -> customer -> Asaas customer.
    let email: string | null = null;
    let name: string | null = null;

    const subId = payment.subscription ? String(payment.subscription) : null;
    const custId = payment.customer ? String(payment.customer) : null;

    if (subId) {
      const { data } = await supabase
        .from("subscription_enrollments")
        .select("user_email,user_name")
        .eq("asaas_subscription_id", subId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if ((data as any)?.user_email) { email = (data as any).user_email; name = (data as any).user_name ?? null; }
    }

    if (!email && custId) {
      const { data } = await supabase
        .from("subscription_enrollments")
        .select("user_email,user_name")
        .eq("asaas_customer_id", custId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if ((data as any)?.user_email) { email = (data as any).user_email; name = (data as any).user_name ?? null; }
    }

    if (!email && custId) {
      const r = await asaasGet(`/customers/${encodeURIComponent(custId)}`, asaasToken);
      if (r.ok) {
        const c = await r.json();
        if (c?.email) { email = String(c.email); name = c?.name ?? null; }
      }
    }

    if (!email) {
      return jsonRes({ ok: false, code: "email_not_found", error: "Não foi possível identificar o cliente do pagamento." }, 404);
    }
    email = email.trim().toLowerCase();

    // Garante que o usuário existe no Auth (email já confirmado para poder logar).
    let exists = false;
    try {
      const r = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=1`,
        { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
      );
      if (r.ok) {
        const j = await r.json();
        exists = (j?.users ?? []).some((u: any) => u.email?.toLowerCase() === email);
      }
    } catch (_e) {
      // ignore
    }

    if (!exists) {
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        password: `Tmp-${crypto.randomUUID()}`,
        email_confirm: true,
        user_metadata: { name: name ?? email, role: "medico" },
      });
      if (createError) {
        const msg = String((createError as any)?.message ?? "").toLowerCase();
        const already = msg.includes("already") || msg.includes("registered") || msg.includes("exists");
        if (!already) {
          return jsonRes({ ok: false, error: "Falha ao preparar o acesso do usuário." }, 500);
        }
      }
    }

    // Gera um token de uso único (magiclink) para a tela criar a sessão.
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    const tokenHash = (linkData as any)?.properties?.hashed_token as string | undefined;
    if (linkErr || !tokenHash) {
      return jsonRes({ ok: false, error: "Falha ao gerar o acesso." }, 500);
    }

    return jsonRes({ ok: true, email, token_hash: tokenHash });
  } catch (error: any) {
    console.error("[public-checkout-finish] unhandled error", error);
    return jsonRes({ ok: false, error: error?.message ?? "Erro desconhecido" }, 500);
  }
});
