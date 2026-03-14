import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BillingQuota = {
  used: number;
  limit: number | null; // null = sem limite definido no plano
  isOverLimit: boolean;
  isNearLimit: boolean;
  loading: boolean;
};

function extractLimit(description: string | null): number | null {
  if (!description) return null;
  // "Até 10 cirurgias" → 10
  const match = description.match(/(\d+)\s*cirurgia/i);
  return match ? parseInt(match[1], 10) : null;
}

export function useBillingQuota(): BillingQuota {
  const [quota, setQuota] = useState<BillingQuota>({
    used: 0,
    limit: null,
    isOverLimit: false,
    isNearLimit: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        if (!cancelled)
          setQuota({ used: 0, limit: null, isOverLimit: false, isNearLimit: false, loading: false });
        return;
      }

      // 1) Contar faturamentos do mês corrente (apenas ATIVOS)
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const lastDay = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

      const { count, error: countError } = await supabase
        .from("faturamentos")
        .select("id", { count: "exact", head: true })
        .eq("medico_id", user.id)
        .gte("created_at", firstDay)
        .lt("created_at", lastDay);

      if (cancelled) return;

      const used = countError ? 0 : (count ?? 0);

      // 2) Buscar o plano do médico via enrollment → plan description
      const email = user.email?.toLowerCase().trim() ?? "";
      const { data: enrollment } = await supabase
        .from("subscription_enrollments")
        .select("subscription_plans(description)")
        .eq("user_email", email)
        .in("status", ["ACTIVE", "TRIAL"])
        .eq("cancelado", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      const description = (enrollment as any)?.subscription_plans?.description ?? null;
      const limit = extractLimit(description);

      const isOverLimit = limit !== null && used >= limit;
      const isNearLimit = limit !== null && used >= limit * 0.8;

      setQuota({ used, limit, isOverLimit, isNearLimit, loading: false });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return quota;
}
