import { supabase } from "@/integrations/supabase/client";
import type { DbSubscriptionEnrollment } from "@/db/schema";

export type SubscriptionEnrollment = DbSubscriptionEnrollment;

export type SubscriptionEnrollmentInput = Pick<
  SubscriptionEnrollment,
  | "plan_id"
  | "asaas_subscription_id"
  | "asaas_customer_id"
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
  | "metadata"
>;

export async function listarSubscriptionEnrollments(): Promise<
  SubscriptionEnrollment[]
> {
  const { data, error } = await supabase
    .from("subscription_enrollments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as SubscriptionEnrollment[];
}

export async function criarSubscriptionEnrollment(
  payload: SubscriptionEnrollmentInput,
): Promise<SubscriptionEnrollment> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);

  const uid = authData.user?.id;
  if (!uid) throw new Error("Sessão expirada. Faça login novamente.");

  const { data, error } = await supabase
    .from("subscription_enrollments")
    .insert({
      ...payload,
      created_by: uid,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Falha ao criar assinante.");

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

  if (error || !data) throw new Error(error?.message ?? "Falha ao atualizar assinante.");

  return data as SubscriptionEnrollment;
}

export async function excluirSubscriptionEnrollment(id: string): Promise<void> {
  const { error } = await supabase
    .from("subscription_enrollments")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message || "Falha ao excluir assinante.");
}