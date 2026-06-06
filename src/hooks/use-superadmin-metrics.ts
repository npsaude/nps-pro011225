import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SuperAdminMetrics = {
  totalMedicos: number | null;
  totalFaturamentos: number | null;
};

const EMPTY_METRICS: SuperAdminMetrics = {
  totalMedicos: null,
  totalFaturamentos: null,
};

/** Busca as métricas do painel superadmin (contagens). */
export async function fetchSuperAdminMetrics(): Promise<SuperAdminMetrics> {
  const [medicosRes, faturamentosRes] = await Promise.all([
    // Médicos ativos = assinaturas ACTIVE ou TRIAL não canceladas
    supabase
      .from("subscription_enrollments")
      .select("id", { count: "exact", head: true })
      .in("status", ["ACTIVE", "TRIAL"])
      .or("cancelado.is.null,cancelado.eq.false"),
    supabase
      .from("faturamentos")
      .select("id", { count: "exact", head: true }),
  ]);

  return {
    totalMedicos: medicosRes.count ?? null,
    totalFaturamentos: faturamentosRes.count ?? null,
  };
}

export function useSuperAdminMetrics(enabled: boolean) {
  const { data, isFetching } = useQuery({
    queryKey: ["superadmin", "metrics"],
    queryFn: fetchSuperAdminMetrics,
    enabled,
    staleTime: 1000 * 60 * 5,
  });

  return { metrics: data ?? EMPTY_METRICS, loading: isFetching };
}
