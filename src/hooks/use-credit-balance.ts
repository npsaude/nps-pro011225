import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CREDITS_PER_ACOMPANHAMENTO,
  CREDITS_PER_FATURAMENTO,
  extractPlanCredits,
} from "@/utils/credits";
import { subscribeQuotaChanged } from "@/utils/quota-events";

export type CreditBalance = {
  /** Créditos do pacote no período. null = sem limite definido no plano. */
  total: number | null;
  /** Créditos já consumidos no período corrente. */
  used: number;
  /** Créditos restantes. null quando total é null (sem limite). */
  remaining: number | null;
  /** Faturamentos ATIVOS contabilizados no período. */
  faturamentos: number;
  /** Acompanhamentos (SADT) contabilizados no período. */
  acompanhamentos: number;
  /** Início do período da assinatura usado como janela de contagem. */
  periodStart: string | null;
  /** Sem créditos restantes (apenas quando há limite). */
  isOver: boolean;
  /** Perto do fim (≤ 20% do total). */
  isNear: boolean;
  loading: boolean;
};

const EMPTY: CreditBalance = {
  total: null,
  used: 0,
  remaining: null,
  faturamentos: 0,
  acompanhamentos: 0,
  periodStart: null,
  isOver: false,
  isNear: false,
  loading: false,
};

async function fetchBalance(): Promise<CreditBalance> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return EMPTY;

  const email = user.email?.toLowerCase().trim() ?? "";

  const { data: enrollment } = await supabase
    .from("subscription_enrollments")
    .select("current_period_start, subscription_plans(description)")
    .eq("user_email", email)
    .in("status", ["ACTIVE", "TRIAL"])
    .eq("cancelado", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const description =
    (enrollment as any)?.subscription_plans?.description ?? null;
  const total = extractPlanCredits(description);

  // Janela de contagem: a partir do início do período da assinatura.
  // Quando a assinatura renova, current_period_start avança e o consumo
  // do novo período recomeça do zero automaticamente.
  const periodStart =
    (enrollment as any)?.current_period_start ??
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Sem limite definido no plano: não há controle por créditos.
  if (total === null) {
    return { ...EMPTY, periodStart, loading: false };
  }

  const [{ count: countFaturamentos }, { count: countAcompanhamentos }] =
    await Promise.all([
      supabase
        .from("faturamentos")
        .select("id", { count: "exact", head: true })
        .eq("medico_id", user.id)
        .eq("status", "ATIVO")
        .gte("created_at", periodStart),
      supabase
        .from("sadt_acompanhamento")
        .select("id", { count: "exact", head: true })
        .eq("medico_id", user.id)
        .gte("created_at", periodStart),
    ]);

  const faturamentos = countFaturamentos ?? 0;
  const acompanhamentos = countAcompanhamentos ?? 0;
  const used =
    faturamentos * CREDITS_PER_FATURAMENTO +
    acompanhamentos * CREDITS_PER_ACOMPANHAMENTO;
  const remaining = total - used;

  return {
    total,
    used,
    remaining,
    faturamentos,
    acompanhamentos,
    periodStart,
    isOver: remaining <= 0,
    isNear: remaining > 0 && remaining <= total * 0.2,
    loading: false,
  };
}

/**
 * Hook de saldo de créditos do pacote contratado. Recalcula ao montar e
 * sempre que um faturamento/acompanhamento é criado (evento de quota).
 */
export function useCreditBalance(): CreditBalance & { refresh: () => void } {
  const [balance, setBalance] = useState<CreditBalance>({
    ...EMPTY,
    loading: true,
  });
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => subscribeQuotaChanged(refresh), [refresh]);

  useEffect(() => {
    let cancelled = false;
    void fetchBalance().then((result) => {
      if (!cancelled) setBalance(result);
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { ...balance, refresh };
}
