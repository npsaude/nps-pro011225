// @ts-nocheck
/**
 * Controle do pacote contratado por créditos (lado servidor).
 *
 * Cada pacote (subscription_plans.description) define uma quantidade de créditos
 * por período da assinatura. Custos: faturamento = 10, acompanhamento = 2.
 * O consumo é contado a partir de current_period_start do enrollment ativo,
 * reiniciando a cada renovação.
 */

export const CREDITS_PER_FATURAMENTO = 10;
export const CREDITS_PER_ACOMPANHAMENTO = 2;

export function extractPlanCredits(description: string | null): number | null {
  if (!description) return null;
  const match = String(description).match(/(\d+)\s*cr[ée]ditos?/i);
  return match ? parseInt(match[1], 10) : null;
}

export interface CreditBalance {
  total: number | null; // null = sem limite definido no plano
  used: number;
  remaining: number | null;
}

/**
 * Calcula o saldo de créditos de um médico (auth user id) usando o cliente
 * com service role. Fail-open: quando não há plano/limite, retorna total null
 * (sem bloqueio).
 */
export async function getCreditBalance(
  supabaseAdmin: any,
  userId: string,
): Promise<CreditBalance> {
  const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = userRes?.user?.email?.toLowerCase?.().trim?.() ?? "";
  if (!email) return { total: null, used: 0, remaining: null };

  const { data: enrollment } = await supabaseAdmin
    .from("subscription_enrollments")
    .select("current_period_start, subscription_plans(description)")
    .ilike("user_email", email)
    .in("status", ["ACTIVE", "TRIAL"])
    .eq("cancelado", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const description = enrollment?.subscription_plans?.description ?? null;
  const total = extractPlanCredits(description);
  if (total === null) return { total: null, used: 0, remaining: null };

  const periodStart =
    enrollment?.current_period_start ??
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: countFaturamentos }, { count: countAcompanhamentos }] =
    await Promise.all([
      supabaseAdmin
        .from("faturamentos")
        .select("id", { count: "exact", head: true })
        .eq("medico_id", userId)
        .eq("status", "ATIVO")
        .gte("created_at", periodStart),
      supabaseAdmin
        .from("sadt_acompanhamento")
        .select("id", { count: "exact", head: true })
        .eq("medico_id", userId)
        .gte("created_at", periodStart),
    ]);

  const used =
    (countFaturamentos ?? 0) * CREDITS_PER_FATURAMENTO +
    (countAcompanhamentos ?? 0) * CREDITS_PER_ACOMPANHAMENTO;

  return { total, used, remaining: total - used };
}
