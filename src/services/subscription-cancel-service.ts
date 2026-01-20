import { supabase } from "@/integrations/supabase/client";

export async function cancelarAssinatura(enrollmentId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("cancel-subscription", {
    body: { enrollment_id: enrollmentId },
  });

  if (error) {
    throw new Error(error.message || "Não foi possível cancelar a assinatura.");
  }

  if ((data as any)?.error) {
    throw new Error((data as any).error);
  }
}