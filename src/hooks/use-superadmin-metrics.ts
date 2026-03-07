import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SuperAdminMetrics = {
  totalMedicos: number | null;
  totalFaturamentos: number | null;
};

export function useSuperAdminMetrics(enabled: boolean) {
  const [metrics, setMetrics] = useState<SuperAdminMetrics>({
    totalMedicos: null,
    totalFaturamentos: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    const fetch = async () => {
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

      if (cancelled) return;

      setMetrics({
        totalMedicos: medicosRes.count ?? null,
        totalFaturamentos: faturamentosRes.count ?? null,
      });
      setLoading(false);
    };

    void fetch();
    return () => { cancelled = true; };
  }, [enabled]);

  return { metrics, loading };
}