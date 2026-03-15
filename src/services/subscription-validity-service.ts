import { supabase } from "@/integrations/supabase/client";

export const SUBSCRIPTION_EXPIRED_CODE = "SUBSCRIPTION_EXPIRED";

function createSubscriptionExpiredError(currentPeriodEnd: string | null) {
  const err = new Error(
    "Sua inscrição está encerrada. Para continuar, renove sua inscrição.",
  ) as Error & { code?: string; currentPeriodEnd?: string | null };

  err.code = SUBSCRIPTION_EXPIRED_CODE;
  err.currentPeriodEnd = currentPeriodEnd;

  return err;
}

/**
 * Valida a assinatura do usuário logado via Edge Function.
 *
 * Regra: só bloqueia quando a edge function responde explicitamente com
 * { valid: false }. Erros de rede, 401, 500, etc. NÃO bloqueiam o acesso
 * (fail-open) para evitar falsos positivos em clientes recém-criados ou
 * em situações de token em transição (ex: logo após reset de senha).
 */
export async function ensureCurrentUserSubscriptionValid(): Promise<void> {
  let data: unknown = null;
  let invokeError: unknown = null;

  try {
    const result = await supabase.functions.invoke("check-subscription", {
      body: {},
    });
    data = result.data;
    invokeError = result.error;
  } catch (err) {
    // Erro de rede ou exceção inesperada → fail-open (não bloqueia)
    console.warn("[subscription-validity] invoke threw, skipping check:", err);
    return;
  }

  if (invokeError) {
    // Erro HTTP da edge function (401, 500, etc.) → fail-open
    console.warn(
      "[subscription-validity] edge function error, skipping check:",
      invokeError,
    );
    return;
  }

  // A edge function respondeu com sucesso — verificar o campo valid
  const valid = Boolean((data as any)?.valid);

  if (valid) return;

  // Só bloqueia se a resposta for explicitamente valid: false
  const reason = (data as any)?.reason as string | undefined;
  const currentPeriodEnd = ((data as any)?.current_period_end ?? null) as
    | string
    | null;

  console.warn("[subscription-validity] subscription invalid:", {
    reason,
    currentPeriodEnd,
    data,
  });

  await supabase.auth.signOut();
  throw createSubscriptionExpiredError(currentPeriodEnd);
}
