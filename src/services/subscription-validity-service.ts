import { supabase } from "@/integrations/supabase/client";

export const SUBSCRIPTION_EXPIRED_CODE = "SUBSCRIPTION_EXPIRED";

type SubscriptionEnrollmentRow = {
  current_period_end: string | null;
  cancelado?: boolean | null;
  status?: string | null;
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
 * Valida a assinatura do usuário logado.
 * Implementação via Edge Function porque o client pode não conseguir ler
 * subscription_enrollments por RLS (retornando [] mesmo com assinatura existente).
 */
export async function ensureCurrentUserSubscriptionValid(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("check-subscription", {
    body: {},
  });

  if (error) {
    throw new Error(
      error.message || "Não foi possível verificar a validade da sua inscrição.",
    );
  }

  const valid = Boolean((data as any)?.valid);

  if (valid) return;

  const currentPeriodEnd = ((data as any)?.current_period_end ?? null) as
    | string
    | null;

  await supabase.auth.signOut();
  throw createSubscriptionExpiredError(currentPeriodEnd);
}