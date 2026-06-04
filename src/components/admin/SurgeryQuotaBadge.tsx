import { useEffect, useState } from "react";
import { Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { subscribeQuotaChanged } from "@/utils/quota-events";

type QuotaData = {
  used: number;
  limit: number | null;
  loading: boolean;
};

// Cache em memória compartilhado entre montagens do componente.
// Permite que, ao alternar de tela, a badge apareça imediatamente
// com o último valor conhecido, evitando o "pulo" visual no header.
let quotaCache: { used: number; limit: number | null } | null = null;

function extractLimit(description: string | null): number | null {
  if (!description) return null;
  const match = description.match(/(\d+)\s*cirurgia/i);
  return match ? parseInt(match[1], 10) : null;
}

export default function SurgeryQuotaBadge() {
  const [quota, setQuota] = useState<QuotaData>(() =>
    quotaCache
      ? { ...quotaCache, loading: false }
      : { used: 0, limit: null, loading: true },
  );
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    return subscribeQuotaChanged(() => setReloadTick((t) => t + 1));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        if (!cancelled) {
          quotaCache = null;
          setQuota({ used: 0, limit: null, loading: false });
        }
        return;
      }

      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const lastDay = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

      const { count, error: countError } = await supabase
        .from("faturamentos")
        .select("id", { count: "exact", head: true })
        .gte("created_at", firstDay)
        .lt("created_at", lastDay);

      if (cancelled) return;

      const used = countError ? 0 : (count ?? 0);

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

      const description =
        (enrollment as { subscription_plans?: { description?: string | null } | null })
          ?.subscription_plans?.description ?? null;
      const limit = extractLimit(description);

      quotaCache = { used, limit };
      setQuota({ used, limit, loading: false });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  // Placeholder com mesmas dimensões enquanto carrega pela 1ª vez
  // — assim o header não "salta" ao montar a tela.
  if (quota.loading) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-400 ring-1 ring-slate-200">
        <Scissors className="h-3.5 w-3.5 opacity-60" />
        <span className="inline-block h-3 w-8 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (quota.limit === null) return null;

  const isOver = quota.used >= quota.limit;
  const isNear = quota.used >= quota.limit * 0.8;

  const colorClasses = isOver
    ? "bg-rose-50 text-rose-600 ring-rose-200"
    : isNear
      ? "bg-amber-50 text-amber-600 ring-amber-200"
      : "bg-emerald-50 text-emerald-600 ring-emerald-200";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ring-1 transition ${colorClasses}`}
        >
          <Scissors className="h-3.5 w-3.5" />
          <span>
            {quota.used}/{quota.limit}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p className="font-medium">Cirurgias no mês</p>
        <p className="text-slate-400">
          {quota.used} de {quota.limit} do seu plano
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
