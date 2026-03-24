import { useEffect, useState, type ReactNode } from "react";
import { Brain, Circle, Database, RefreshCw, Webhook } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  carregarSaudeDosServicos,
  createCheckingHealth,
  type ServiceIndicator,
  type ServicesHealth,
} from "@/services/service-health-service";

type ItemProps = {
  icon: ReactNode;
  label: string;
  indicator: ServiceIndicator;
};

function colorByStatus(status: ServiceIndicator["status"]) {
  if (status === "ok") {
    return {
      dot: "text-emerald-500",
      chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
      label: "OK",
    };
  }

  if (status === "error") {
    return {
      dot: "text-rose-500",
      chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
      label: "Não funcionando",
    };
  }

  return {
    dot: "text-amber-500",
    chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    label: "Verificando",
  };
}

function formatCheckedAt(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("pt-BR");
}

function StatusItem({ icon, label, indicator }: ItemProps) {
  const ui = colorByStatus(indicator.status);

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {icon}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {label}
            </span>
            <Circle className={`h-3.5 w-3.5 fill-current ${ui.dot}`} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {indicator.message}
          </p>
          {indicator.checkedAt ? (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Última checagem: {formatCheckedAt(indicator.checkedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${ui.chip}`}>
        {ui.label}
      </span>
    </div>
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
    <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Status dos serviços
          </CardTitle>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Semáforo operacional da aplicação.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => void load()}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        <StatusItem
          icon={<Webhook className="h-4 w-4" />}
          label="Webhook da Asaas"
          indicator={health.webhookAsaas}
        />
        <StatusItem
          icon={<Brain className="h-4 w-4" />}
          label="IA"
          indicator={health.ia}
        />
        <StatusItem
          icon={<Database className="h-4 w-4" />}
          label="Supabase"
          indicator={health.supabase}
        />

        {loadError ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">{loadError}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
