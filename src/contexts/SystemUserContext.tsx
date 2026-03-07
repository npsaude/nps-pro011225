import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DbSystemUser } from "@/db/schema";

type SystemUserState = {
  loading: boolean;
  systemUser: DbSystemUser | null;
  error: Error | null;
  reload: () => void;
};

const SystemUserContext = createContext<SystemUserState>({
  loading: true,
  systemUser: null,
  error: null,
  reload: () => {},
});

export function SystemUserProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [systemUser, setSystemUser] = useState<DbSystemUser | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("conmedic_role");
      }
      setSystemUser(null);
      setLoading(false);
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
      setError(byIdError);
      setLoading(false);
      return;
    }

    let user = byId as DbSystemUser | null;

    // 2) fallback por email
    if (!user) {
      const { data: byEmail } = await supabase
        .from("usuarios_sistema")
        .select("*")
        .ilike("email", email)
        .maybeSingle();
      if (byEmail) user = byEmail as DbSystemUser;
    }

    // Persiste role no localStorage para leituras síncronas (ex.: guards)
    if (typeof window !== "undefined") {
      const role = String((user as any)?.regra ?? "").trim().toUpperCase();
      if (role) window.localStorage.setItem("conmedic_role", role);
      else window.localStorage.removeItem("conmedic_role");
    }

    setSystemUser(user);
    setLoading(false);

    // Carrega avatar em background sem bloquear o menu
    if (user) {
      const { data: avatarRow } = await supabase
        .from("user_avatars")
        .select("avatar_path")
        .eq("user_id", uid)
        .maybeSingle();

      const avatarPath = (avatarRow as any)?.avatar_path ?? null;
      if (avatarPath) {
        setSystemUser((prev) =>
          prev ? ({ ...prev, avatar_url: avatarPath } as DbSystemUser) : prev
        );
      }
    }
  }, []);

  useEffect(() => {
    void load();

    // Re-carrega quando a sessão muda (login / logout)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void load();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [load]);

  return (
    <SystemUserContext.Provider value={{ loading, systemUser, error, reload: load }}>
      {children}
    </SystemUserContext.Provider>
  );
}

export function useSystemUserContext() {
  return useContext(SystemUserContext);
}
