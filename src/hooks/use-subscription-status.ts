import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionStatus = {
  status: string | null;
  cancelado: boolean | null;
};

const EMPTY_STATUS: SubscriptionStatus = { status: null, cancelado: null };

function normalizeStatus(status: unknown) {
  const s = String(status ?? "").trim().toUpperCase();
  return s || null;
}

/** Busca o status da assinatura via edge function `check-subscription`. */
export async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return EMPTY_STATUS;

  const { data, error } = await supabase.functions.invoke("check-subscription", {
    body: {},
  });

  if (error) return EMPTY_STATUS;

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: normalizeStatus((data as any)?.status),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cancelado: (data as any)?.cancelado ?? null,
  };
}

export function useSubscriptionStatus() {
  const { data, isFetching } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: fetchSubscriptionStatus,
    staleTime: 1000 * 60 * 2,
  });

  return {
    loading: isFetching,
    status: data?.status ?? null,
    cancelado: data?.cancelado ?? null,
  };
}
