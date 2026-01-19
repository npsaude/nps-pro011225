import { supabase } from "@/integrations/supabase/client";
import type { DbSubscriptionEnrollment, DbSubscriptionEnrollmentStatus } from "@/db/schema";

export type SubscriptionEnrollmentStatus = DbSubscriptionEnrollmentStatus;

export interface SubscriptionEnrollment extends DbSubscriptionEnrollment {}

export type SubscriptionEnrollmentInput = Pick<
  SubscriptionEnrollment,
  | "plan_id"
  | "user_name"
  | "user_email"
  | "user_phone"
  | "status"
  | "payment_method"
  | "current_period_start"
  | "current_period_end"
  | "started_at"
  | "ended_at"
  | "last_payment_at"
> & {
  asaas_subscription_id?: string | null;
  asaas_customer_id?: string | null;
};

export async function listarSubscriptionEnrollments(): Promise<
  SubscriptionEnrollment[]
> {
  const { data, error } = await supabase
    .from("subscription_enrollments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      error.message || "Não foi possível carregar os assinantes.",
    );
  }

  return (data ?? []) as SubscriptionEnrollment[];
}

export async function criarSubscriptionEnrollment(
  payload: SubscriptionEnrollmentInput,
): Promise<SubscriptionEnrollment> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const userId = authData.user?.id;
  if (!userId) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const { data, error } = await supabase
    .from("subscription_enrollments")
    .insert({
      ...payload,
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível criar o assinante.");
  }

  return data as SubscriptionEnrollment;
}

export async function atualizarSubscriptionEnrollment(
  id: string,
  payload: Partial<SubscriptionEnrollmentInput>,
): Promise<SubscriptionEnrollment> {
  const { data, error } = await supabase
    .from("subscription_enrollments")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível atualizar o assinante.");
  }

  return data as SubscriptionEnrollment;
}