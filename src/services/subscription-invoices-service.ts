import { supabase } from "@/integrations/supabase/client";

export type SubscriptionInvoice = {
  id: string;
  dueDate: string | null;
  value: number | null;
  status: string | null;
  invoiceUrl: string | null;
};

export async function listarFaturasAssinatura(params: {
  enrollmentId: string;
}): Promise<SubscriptionInvoice[]> {
  const { enrollmentId } = params;

  const { data, error } = await supabase.functions.invoke("list-subscription-invoices", {
    body: { enrollment_id: enrollmentId },
  });

  if (error) {
    throw new Error(error.message || "Não foi possível carregar o histórico de faturamento.");
  }

  if ((data as any)?.error) {
    throw new Error((data as any).error);
  }

  return ((data as any)?.invoices ?? []) as SubscriptionInvoice[];
}