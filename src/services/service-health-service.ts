import { supabase } from "@/integrations/supabase/client";

export type ServiceIndicatorStatus = "ok" | "error" | "checking";

export type ServiceIndicator = {
  status: ServiceIndicatorStatus;
  message: string;
  checkedAt: string | null;
};

export type ServicesHealth = {
  webhookAsaas: ServiceIndicator;
  ia: ServiceIndicator;
  supabase: ServiceIndicator;
};

export type IAUsageMetrics = {
  totalUsd: number;
  currentMonthUsd: number;
};

export function createCheckingIndicator(message = "Verificando..."): ServiceIndicator {
  return {
    status: "checking",
    message,
    checkedAt: null,
  };
}

export function createCheckingHealth(): ServicesHealth {
  return {
    webhookAsaas: createCheckingIndicator(),
    ia: createCheckingIndicator(),
    supabase: createCheckingIndicator(),
  };
}

function parseUsd(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function carregarSaudeDosServicos(): Promise<ServicesHealth> {
  const { data, error } = await supabase.functions.invoke("service-health", {
    body: {},
  });

  if (error) {
    throw new Error(error.message || "Não foi possível verificar os serviços.");
  }

  const result = data as ServicesHealth & { error?: string };
  if (result?.error) {
    throw new Error(result.error);
  }

  return result;
}

export async function carregarUsoIA(): Promise<IAUsageMetrics> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { data, error } = await supabase
    .from("openai_usage_logs")
    .select("created_at, estimated_cost_usd");

  if (error) {
    throw new Error(error.message || "Não foi possível carregar o uso de IA.");
  }

  const rows = data ?? [];

  const metrics = rows.reduce<IAUsageMetrics>(
    (acc, row) => {
      const cost = parseUsd(row.estimated_cost_usd);
      acc.totalUsd += cost;

      if (row.created_at) {
        const createdAt = new Date(row.created_at);
        if (createdAt >= currentMonthStart && createdAt < nextMonthStart) {
          acc.currentMonthUsd += cost;
        }
      }

      return acc;
    },
    { totalUsd: 0, currentMonthUsd: 0 },
  );

  return metrics;
}