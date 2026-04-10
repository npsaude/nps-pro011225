import { supabase } from "@/integrations/supabase/client";

export type BillingInterval =
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "YEARLY";

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

function normalizeBillingInterval(value: unknown): BillingInterval {
  switch (String(value ?? "").toUpperCase()) {
    case "WEEKLY":
      return "WEEKLY";
    case "BIWEEKLY":
      return "BIWEEKLY";
    case "QUARTERLY":
      return "QUARTERLY";
    case "SEMIANNUALLY":
      return "SEMIANNUALLY";
    case "YEAR":
    case "YEARLY":
      return "YEARLY";
    case "MONTH":
    case "MONTHLY":
    default:
      return "MONTHLY";
  }
}

function normalizePlan(row: Record<string, unknown>): SubscriptionPlan {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    code: String(row.code ?? ""),
    description: typeof row.description === "string" ? row.description : null,
    price_month: toNumber(row.price_month),
    price_annual: toNumber(row.price_annual),
    currency: String(row.currency ?? "BRL"),
    billing_interval: normalizeBillingInterval(row.billing_interval),
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

  return (data ?? []).map((row) => normalizePlan(row as Record<string, unknown>));
}

export async function criarSubscriptionPlan(
  payload: SubscriptionPlanInput,
): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .insert(payload)
    .select(planSelect)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível criar o plano.");
  }

  return normalizePlan(data as Record<string, unknown>);
}

export async function atualizarSubscriptionPlan(
  id: string,
  payload: Partial<SubscriptionPlanInput>,
): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(planSelect)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível atualizar o plano.");
  }

  return normalizePlan(data as Record<string, unknown>);
}
