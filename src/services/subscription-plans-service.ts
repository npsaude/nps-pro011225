import { supabase } from "@/integrations/supabase/client";

export type BillingInterval =
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "YEARLY";

type DbBillingInterval = "DAY" | "WEEK" | "MONTH" | "YEAR";

interface DbSubscriptionPlanRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price_month: number | string;
  price_annual: number | string;
  currency: string;
  billing_interval: DbBillingInterval | string;
  interval_count: number;
  external_plan_id: string | null;
  setup_fee_cents: number;
  trial_days: number;
  metadata: unknown | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price_month: number;
  price_annual: number;
  currency: string;
  billing_interval: BillingInterval;
  interval_count: number;
  external_plan_id: string | null;
  setup_fee_cents: number;
  trial_days: number;
  metadata: unknown | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanInput {
  name: string;
  code: string;
  description: string | null;
  price_month: number;
  price_annual: number;
  currency: string;
  billing_interval: BillingInterval;
  interval_count: number;
  external_plan_id: string | null;
  setup_fee_cents: number;
  trial_days: number;
  metadata: unknown | null;
  active: boolean;
}

const planSelect = `
  id,
  name,
  code,
  description,
  price_month,
  price_annual,
  currency,
  billing_interval,
  interval_count,
  external_plan_id,
  setup_fee_cents,
  trial_days,
  metadata,
  active,
  created_at,
  updated_at
`;

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBillingCycle(interval: unknown, count: unknown): BillingInterval {
  const normalizedInterval = String(interval ?? "").toUpperCase();
  const normalizedCount = toNumber(count);

  if (normalizedInterval === "WEEK" && normalizedCount === 2) {
    return "BIWEEKLY";
  }

  if (normalizedInterval === "WEEK") {
    return "WEEKLY";
  }

  if (normalizedInterval === "MONTH" && normalizedCount === 3) {
    return "QUARTERLY";
  }

  if (normalizedInterval === "MONTH" && normalizedCount === 6) {
    return "SEMIANNUALLY";
  }

  if (normalizedInterval === "YEAR") {
    return "YEARLY";
  }

  return "MONTHLY";
}

function toDbBillingValues(cycle: BillingInterval): {
  billing_interval: DbBillingInterval;
  interval_count: number;
} {
  switch (cycle) {
    case "WEEKLY":
      return { billing_interval: "WEEK", interval_count: 1 };
    case "BIWEEKLY":
      return { billing_interval: "WEEK", interval_count: 2 };
    case "QUARTERLY":
      return { billing_interval: "MONTH", interval_count: 3 };
    case "SEMIANNUALLY":
      return { billing_interval: "MONTH", interval_count: 6 };
    case "YEARLY":
      return { billing_interval: "YEAR", interval_count: 1 };
    case "MONTHLY":
    default:
      return { billing_interval: "MONTH", interval_count: 1 };
  }
}

function normalizePlan(row: DbSubscriptionPlanRow): SubscriptionPlan {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    code: String(row.code ?? ""),
    description: typeof row.description === "string" ? row.description : null,
    price_month: toNumber(row.price_month),
    price_annual: toNumber(row.price_annual),
    currency: String(row.currency ?? "BRL"),
    billing_interval: toBillingCycle(row.billing_interval, row.interval_count),
    interval_count: toNumber(row.interval_count),
    external_plan_id:
      typeof row.external_plan_id === "string" ? row.external_plan_id : null,
    setup_fee_cents: toNumber(row.setup_fee_cents),
    trial_days: toNumber(row.trial_days),
    metadata: row.metadata ?? null,
    active: Boolean(row.active),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function toDbPayload(payload: SubscriptionPlanInput | Partial<SubscriptionPlanInput>) {
  const dbValues = payload.billing_interval
    ? toDbBillingValues(payload.billing_interval)
    : {};

  return {
    ...payload,
    ...dbValues,
  };
}

export async function listarSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select(planSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      error.message || "Não foi possível carregar os planos de assinatura.",
    );
  }

  return (data ?? []).map((row) => normalizePlan(row as DbSubscriptionPlanRow));
}

export async function criarSubscriptionPlan(
  payload: SubscriptionPlanInput,
): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .insert(toDbPayload(payload))
    .select(planSelect)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível criar o plano.");
  }

  return normalizePlan(data as DbSubscriptionPlanRow);
}

export async function atualizarSubscriptionPlan(
  id: string,
  payload: Partial<SubscriptionPlanInput>,
): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .update({
      ...toDbPayload(payload),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(planSelect)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível atualizar o plano.");
  }

  return normalizePlan(data as DbSubscriptionPlanRow);
}
