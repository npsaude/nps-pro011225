import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type State = {
  loading: boolean;
  status: string | null;
  cancelado: boolean | null;
};

function normalizeStatus(status: unknown) {
  const s = String(status ?? "").trim().toUpperCase();
  return s || null;
}

export function useSubscriptionStatus() {
  const [state, setState] = useState<State>({
    loading: true,
    status: null,
    cancelado: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState({ loading: true, status: null, cancelado: null });

      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        if (!cancelled) setState({ loading: false, status: null, cancelado: null });
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        body: {},
      });

      if (cancelled) return;

      if (error) {
        setState({ loading: false, status: null, cancelado: null });
        return;
      }

      setState({
        loading: false,
        status: normalizeStatus((data as any)?.status),
        cancelado: (data as any)?.cancelado ?? null,
      });
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}