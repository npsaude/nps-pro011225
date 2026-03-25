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

  // Se data veio como string (edge function retornou texto em vez de JSON parsed),
  // tenta parsear manualmente antes de avaliar.
  let parsed: Record<string, unknown> | null = null;

  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      // Não é JSON válido → fail-open
      console.warn("[subscription-validity] data is non-JSON string, skipping check:", data);
      return;
    }
  } else if (data && typeof data === "object") {
    parsed = data as Record<string, unknown>;
  }

  // Se não conseguiu obter um objeto válido → fail-open
  if (!parsed) {
    console.warn("[subscription-validity] no parseable data, skipping check:", data);
    return;
  }

  const valid = Boolean(parsed.valid);

  if (valid) return;

  // Só bloqueia se a resposta for explicitamente valid: false
  const reason = parsed.reason as string | undefined;
  const currentPeriodEnd = (parsed.current_period_end ?? null) as string | null;

  console.warn("[subscription-validity] subscription invalid:", {
    reason,
    currentPeriodEnd,
    data: parsed,
  });

  await supabase.auth.signOut();
  throw createSubscriptionExpiredError(currentPeriodEnd);
}