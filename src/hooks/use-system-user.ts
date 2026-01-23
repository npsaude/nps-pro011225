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
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("conmedic_role");
        }
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

      // Cache do role para UI mais rápida (ex.: sidebar)
      if (typeof window !== "undefined") {
        const role = String((systemUser as any)?.regra ?? "").trim().toUpperCase();
        if (role) window.localStorage.setItem("conmedic_role", role);
      }

      // ✅ Importante: libera o usuário imediatamente (não espera avatar)
      if (!cancelled) {
        setState({
          loading: false,
          systemUser: systemUser,
          error: null,
        });
      }

      // 3) carrega avatar salvo no banco (user_avatars) em background (não bloqueia UI)
      const { data: avatarRow, error: avatarError } = await supabase
        .from("user_avatars")
        .select("avatar_path")
        .eq("user_id", uid)
        .maybeSingle();

      if (cancelled) return;

      if (avatarError) {
        // Não bloqueia a UI por causa de avatar
        // eslint-disable-next-line no-console
        console.warn("[useSystemUser] Falha ao carregar avatar:", avatarError);
        return;
      }

      const avatarPath = (avatarRow as any)?.avatar_path ?? null;

      if (avatarPath) {
        setState((prev) => ({
          ...prev,
          systemUser: prev.systemUser
            ? ({
                ...prev.systemUser,
                avatar_url: avatarPath ?? (prev.systemUser as any)?.avatar_url ?? null,
              } as DbSystemUser)
            : prev.systemUser,
        }));
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  return state;
}