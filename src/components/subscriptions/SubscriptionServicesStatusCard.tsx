import { useEffect, useState, type ReactNode } from "react";
import { Activity, Brain, Database, RefreshCw, Webhook } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  carregarSaudeDosServicos,
  carregarUsoIA,
  createCheckingHealth,
  type IAUsageMetrics,
  type ServiceIndicator,
  type ServicesHealth,
} from "@/services/service-health-service";

type ServiceMetric = {
  label: string;
  value: string;
};

type ServiceCardProps = {
  icon: ReactNode;
  label: string;
  indicator: ServiceIndicator;
  metrics?: ServiceMetric[];
};

function getStatusMeta(status: ServiceIndicator["status"]) {
  if (status === "ok") {
    return {
      label: "OK",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
      dot: "bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.45)]",
    };
  }

  if (status === "error") {
    return {
      label: "Não funcionando",
      badge: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
      dot: "bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.45)]",
    };
  }

  return {
    label: "Verificando",
    badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    dot: "bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.45)]",
  };
}

function formatCheckedAt(value: string | null) {
  if (!value) return "Ainda não verificado";
  return new Date(value).toLocaleString("pt-BR");
}

function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function createCheckingUsage(): IAUsageMetrics {
  return {
    totalUsd: 0,
    currentMonthUsd: 0,
  };
}

function MiniTrafficLight({ status }: { status: ServiceIndicator["status"] }) {
  const isGreen = status === "ok";
  const isRed = status === "error";
  const isYellow = status === "checking";

  return (
    <div className="flex h-10 w-6 flex-col items-center justify-center gap-1 rounded-full bg-slate-900 px-1 py-1 shadow-inner dark:bg-slate-950">
      <span className={`h-1.5 w-1.5 rounded-full ${isRed ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]" : "bg-slate-600"}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${isYellow ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]" : "bg-slate-600"}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${isGreen ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" : "bg-slate-600"}`} />
    </div>
  );
}

function ServiceCard({ icon, label, indicator, metrics }: ServiceCardProps) {
  const status = getStatusMeta(indicator.status);
  const hasMetrics = (metrics?.length ?? 0) > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:focus:ring-slate-700"
        >
          <MiniTrafficLight status={indicator.status} />

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {icon}
          </div>

          <div className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-100">
              {label}
            </span>

            {hasMetrics ? (
              <div className="mt-1 space-y-0.5">
                {metrics?.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400"
                  >
                    <span>{metric.label}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.dot}`} />
        </button>
      </TooltipTrigger>

      <TooltipContent
        side="top"
        align="start"
        className="max-w-xs rounded-2xl border-slate-200 bg-white p-3 text-slate-700 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{label}</span>
            <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${status.badge}`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {indicator.message}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Última checagem: {formatCheckedAt(indicator.checkedAt)}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default function SubscriptionServicesStatusCard() {
  const [health, setHealth] = useState<ServicesHealth>(createCheckingHealth());
  const [iaUsage, setIaUsage] = useState<IAUsageMetrics>(createCheckingUsage());
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setRefreshing(true);
    setLoadError(null);
    setHealth(createCheckingHealth());
    setIaUsage(createCheckingUsage());

    try {
      const [healthData, iaUsageData] = await Promise.all([
        carregarSaudeDosServicos(),
        carregarUsoIA(),
      ]);

      setHealth(healthData);
      setIaUsage(iaUsageData);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível verificar os serviços.";

      setLoadError(message);
      setHealth({
        webhookAsaas: {
          status: "error",
          message,
          checkedAt: new Date().toISOString(),
        },
        ia: {
          status: "error",
          message,
          checkedAt: new Date().toISOString(),
        },
        supabase: {
          status: "error",
          message,
          checkedAt: new Date().toISOString(),
        },
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <TooltipProvider delayDuration={120}>
      <Card className="rounded-[28px] border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Serviços
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF0FF] text-[#6B6EEA] dark:bg-indigo-950/60 dark:text-indigo-300">
                <Activity className="h-4 w-4" />
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-slate-950 text-white hover:bg-slate-800 hover:text-white dark:bg-slate-900 dark:hover:bg-slate-800"
                onClick={() => void load()}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-slate-200 via-slate-100 to-transparent dark:from-slate-800 dark:via-slate-800/60 dark:to-transparent" />
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          <div className="grid gap-3 md:grid-cols-3">
            <ServiceCard
              icon={<Webhook className="h-4 w-4" />}
              label="Webhook Asaas"
              indicator={health.webhookAsaas}
            />
            <ServiceCard
              icon={<Brain className="h-4 w-4" />}
              label="IA"
              indicator={health.ia}
              metrics={[
                { label: "Uso total", value: formatUsd(iaUsage.totalUsd) },
                { label: "Mês atual", value: formatUsd(iaUsage.currentMonthUsd) },
              ]}
            />
            <ServiceCard
              icon={<Database className="h-4 w-4" />}
              label="Supabase"
              indicator={health.supabase}
            />
          </div>

          {loadError ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{loadError}</p>
          ) : null}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}