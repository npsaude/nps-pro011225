import { supabase } from "@/integrations/supabase/client";

export async function cancelarAssinatura(
  enrollmentId?: string | null,
): Promise<{ enrollment?: unknown } | void> {
  const { data, error } = await supabase.functions.invoke("cancel-subscription", {
    body: enrollmentId ? { enrollment_id: enrollmentId } : {},
  });

  if (error) {
    throw new Error(error.message || "Não foi possível cancelar a assinatura.");
  }

  if ((data as any)?.error) {
    throw new Error((data as any).error);
  }

  return data as any;
}