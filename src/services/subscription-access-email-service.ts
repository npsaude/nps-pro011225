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

  const result = data as { error?: string; enrollment?: SubscriptionEnrollment };
  if (result?.error) {
    throw new Error(result.error);
  }

  if (!result?.enrollment) {
    throw new Error("Resposta inválida ao reenviar acesso.");
  }

  return result.enrollment;
}
