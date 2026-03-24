import { supabase } from "@/integrations/supabase/client";
import type { SubscriptionEnrollment } from "@/services/subscription-enrollments-service";

export async function reenviarAcessoAssinante(
  enrollmentId: string,
): Promise<SubscriptionEnrollment> {
  const { data, error } = await supabase.functions.invoke(
    "send-subscription-access-email",
    {
      body: {
        enrollment_id: enrollmentId,
        force: true,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Não foi possível reenviar o acesso.");
  }

  if ((data as any)?.error) {
    throw new Error((data as any).error);
  }

  if (!(data as any)?.enrollment) {
    throw new Error("Resposta inválida ao reenviar acesso.");
  }

  return (data as any).enrollment as SubscriptionEnrollment;
}
