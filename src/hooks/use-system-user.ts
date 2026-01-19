import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DbSystemUser } from "@/db/schema";

type State = {
  loading: boolean;
  systemUser: DbSystemUser | null;
  error: Error | null;
};

export function useSystemUser() {
  const [state, setState] = useState<State>({
    loading: true,
    systemUser: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const uid = authData.user?.id ?? null;
        if (!uid) {
          if (!cancelled) {
            setState({ loading: false, systemUser: null, error: null });
          }
          return;
        }

        const { data, error } = await supabase
          .from("usuarios_sistema")
          .select("*")
          .eq("id_user", uid)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled) {
          setState({
            loading: false,
            systemUser: (data as DbSystemUser | null) ?? null,
            error: null,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            loading: false,
            systemUser: null,
            error: e instanceof Error ? e : new Error(String(e)),
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}