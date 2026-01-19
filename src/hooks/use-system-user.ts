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
      setState({ loading: true, systemUser: null, error: null });
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        if (!cancelled) setState({ loading: false, systemUser: null, error: null });
        return;
      }

      const uid = authData.user.id;
      const email = authData.user.email?.trim() ?? "";

      // 1) tenta por id_user
      const { data: byId, error: byIdError } = await supabase
        .from("usuarios_sistema")
        .select("*")
        .eq("id_user", uid)
        .maybeSingle();
      if (byIdError) {
        if (!cancelled) setState({ loading: false, systemUser: null, error: byIdError });
        return;
      }
      let systemUser = byId as DbSystemUser | null;

      // 2) fallback por email (case-insensitive)
      if (!systemUser) {
        const { data: byEmail, error: byEmailError } = await supabase
          .from("usuarios_sistema")
          .select("*")
          .ilike("email", email)
          .maybeSingle();
        if (!byEmailError && byEmail) {
          systemUser = byEmail as DbSystemUser;
        }
      }

      if (!cancelled) {
        setState({ loading: false, systemUser, error: null });
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  return state;
}