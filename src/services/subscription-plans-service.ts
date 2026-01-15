import { supabase } from "@/integrations/supabase/client";

export type BillingInterval = "DAY" | "WEEK" | "MONTH" | "YEAR";

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price_cents: number;
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

export type SubscriptionPlanInput = Omit<
  SubscriptionPlan,
  "id" | "created_at" | "updated_at"
>;

export async function listarSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      error.message || "Não foi possível carregar os planos de assinatura.",
    );
  }

  return (data ?? []) as SubscriptionPlan[];
}

export async function criarSubscriptionPlan(
  payload: SubscriptionPlanInput,
): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível criar o plano.");
  }

  return data as SubscriptionPlan;
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
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível atualizar o plano.");
  }

  return data as SubscriptionPlan;
}