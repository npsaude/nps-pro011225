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

  const result = data as { error?: string; invoices?: SubscriptionInvoice[] };
  if (result?.error) {
    throw new Error(result.error);
  }

  return result?.invoices ?? [];
}