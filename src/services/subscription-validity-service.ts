import { supabase } from "@/integrations/supabase/client";

export const SUBSCRIPTION_EXPIRED_CODE = "SUBSCRIPTION_EXPIRED";

type SubscriptionEnrollmentRow = {
  current_period_end: string | null;
  cancelado?: boolean | null;
  user_email?: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createSubscriptionExpiredError(currentPeriodEnd: string | null) {
  const err = new Error(
    "Sua inscrição está encerrada. Para continuar, renove sua inscrição.",
  ) as Error & { code?: string; currentPeriodEnd?: string | null };

  err.code = SUBSCRIPTION_EXPIRED_CODE;
  err.currentPeriodEnd = currentPeriodEnd;

  return err;
}

/**
 * Valida a assinatura do usuário logado consultando subscription_enrollments.current_period_end.
 * - Se não existir inscrição, trata como expirada.
 * - Se houver mais de uma inscrição, considera válida a que tiver MAIOR current_period_end
 *   dentre as NÃO canceladas.
 * - Se a maior current_period_end < agora, trata como expirada.
 */
export async function ensureCurrentUserSubscriptionValid(): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const userEmail = normalizeEmail(authData.user?.email ?? "");
  if (!userEmail) {
    await supabase.auth.signOut();
    throw createSubscriptionExpiredError(null);
  }

  const { data, error } = await supabase
    .from("subscription_enrollments")
    .select("user_email,current_period_end,cancelado")
    // busca tolerante (caso existam espaços no banco); filtramos exato no client
    .ilike("user_email", `%${userEmail}%`)
    .order("current_period_end", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(
      error.message || "Não foi possível verificar a validade da sua inscrição.",
    );
  }

  const rows = ((data ?? []) as SubscriptionEnrollmentRow[])
    .filter((r) => normalizeEmail(r.user_email ?? "") === userEmail)
    .filter((r) => !Boolean(r.cancelado));

  if (!rows.length) {
    await supabase.auth.signOut();
    throw createSubscriptionExpiredError(null);
  }

  // Escolhe a maior vigência (current_period_end) dentre as não canceladas
  let bestEndIso: string | null = null;
  let bestEndMs = -Infinity;

  for (const r of rows) {
    if (!r.current_period_end) continue;
    const ms = new Date(r.current_period_end).getTime();
    if (Number.isFinite(ms) && ms > bestEndMs) {
      bestEndMs = ms;
      bestEndIso = r.current_period_end;
    }
  }

  if (!bestEndIso || !Number.isFinite(bestEndMs)) {
    await supabase.auth.signOut();
    throw createSubscriptionExpiredError(null);
  }

  if (bestEndMs < Date.now()) {
    await supabase.auth.signOut();
    throw createSubscriptionExpiredError(bestEndIso);
  }
}