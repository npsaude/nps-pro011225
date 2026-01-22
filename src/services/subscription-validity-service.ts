import { supabase } from "@/integrations/supabase/client";

export const SUBSCRIPTION_EXPIRED_CODE = "SUBSCRIPTION_EXPIRED";

type SubscriptionEnrollmentRow = {
  current_period_end: string | null;
};

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
 * - Se current_period_end < agora, trata como expirada.
 */
export async function ensureCurrentUserSubscriptionValid(): Promise<void> {
  const { data, error } = await supabase
    .from("subscription_enrollments")
    .select("current_period_end")
    .order("current_period_end", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(
      error.message || "Não foi possível verificar a validade da sua inscrição.",
    );
  }

  const row = (data?.[0] ?? null) as SubscriptionEnrollmentRow | null;
  const currentPeriodEnd = row?.current_period_end ?? null;

  if (!currentPeriodEnd) {
    await supabase.auth.signOut();
    throw createSubscriptionExpiredError(null);
  }

  const endMs = new Date(currentPeriodEnd).getTime();
  const nowMs = Date.now();

  if (!Number.isFinite(endMs) || endMs < nowMs) {
    await supabase.auth.signOut();
    throw createSubscriptionExpiredError(currentPeriodEnd);
  }
}