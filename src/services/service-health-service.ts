import { supabase } from "@/integrations/supabase/client";

export type ServiceIndicatorStatus = "ok" | "error" | "checking";

export type ServiceIndicator = {
  status: ServiceIndicatorStatus;
  message: string;
  checkedAt: string | null;
};

export type ServicesHealth = {
  webhookAsaas: ServiceIndicator;
  ia: ServiceIndicator;
  supabase: ServiceIndicator;
};

export function createCheckingIndicator(message = "Verificando..."): ServiceIndicator {
  return {
    status: "checking",
    message,
    checkedAt: null,
  };
}

export function createCheckingHealth(): ServicesHealth {
  return {
    webhookAsaas: createCheckingIndicator(),
    ia: createCheckingIndicator(),
    supabase: createCheckingIndicator(),
  };
}

export async function carregarSaudeDosServicos(): Promise<ServicesHealth> {
  const { data, error } = await supabase.functions.invoke("service-health", {
    body: {},
  });

  if (error) {
    throw new Error(error.message || "Não foi possível verificar os serviços.");
  }

  if ((data as any)?.error) {
    throw new Error((data as any).error);
  }

  return data as ServicesHealth;
}
