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
  createCheckingHealth,
  type ServiceIndicator,
  type ServicesHealth,
} from "@/services/service-health-service";

type ServiceRowProps = {
  icon: ReactNode;
  label: string;
  indicator: ServiceIndicator;
};

function getStatusMeta(status: ServiceIndicator["status"]) {
  if (status === "ok") {
    return {
      label: "OK",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
      light: "bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.5)]",
    };
  }

  if (status === "error") {
    return {
      label: "Não funcionando",
      badge: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
      light: "bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.5)]",
    };
  }

  return {
    label: "Verificando",
    badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    light: "bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.5)]",
  };
}

function formatCheckedAt(value: string | null) {
  if (!value) return "Ainda não verificado";
  return new Date(value).toLocaleString("pt-BR");
}

function MiniTrafficLight({ status }: { status: ServiceIndicator["status"] }) {
  const isGreen = status === "ok";
  const isRed = status === "error";
  const isYellow = status === "checking";

  return (
    <div className="flex h-11 w-7 flex-col items-center justify-center gap-1 rounded-full bg-slate-900 px-1.5 py-1 shadow-inner dark:bg-slate-950">
      <span className={`h-1.5 w-1.5 rounded-full ${isRed ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.55)]" : "bg-slate-600"}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${isYellow ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.55)]" : "bg-slate-600"}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${isGreen ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.55)]" : "bg-slate-600"}`} />
    </div>
  );
}

function ServiceRow({ icon, label, indicator }: ServiceRowProps) {
  const status = getStatusMeta(indicator.status);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-900 dark:focus:ring-slate-700"
        >
          <div className="flex min-w-0 items-center gap-3">
            <MiniTrafficLight status={indicator.status} />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
              {icon}
            </div>
            <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
              {label}
            </span>
          </div>

          <span className={`ml-3 h-2.5 w-2.5 shrink-0 rounded-full ${status.light}`} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-xs rounded-2xl border-slate-200 bg-white p-3 text-slate-700 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
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
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setRefreshing(true);
    setLoadError(null);
    setHealth(createCheckingHealth());

    try {
      const data = await carregarSaudeDosServicos();
      setHealth(data);
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
      <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            <span>Serviços</span>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                <Activity className="h-4 w-4" />
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-2xl"
                onClick={() => void load()}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 pb-5">
          <ServiceRow
            icon={<Webhook className="h-4 w-4" />}
            label="Webhook Asaas"
            indicator={health.webhookAsaas}
          />
          <ServiceRow
            icon={<Brain className="h-4 w-4" />}
            label="IA"
            indicator={health.ia}
          />
          <ServiceRow
            icon={<Database className="h-4 w-4" />}
            label="Supabase"
            indicator={health.supabase}
          />

          <p className="pt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Passe o mouse sobre um serviço para ver os detalhes.
          </p>

          {loadError ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{loadError}</p>
          ) : null}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
