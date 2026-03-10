import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
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
  const loadedOnceRef = useRef(false);
  const systemUserRef = useRef<DbSystemUser | null>(null);

  // Mantém o ref sincronizado
  systemUserRef.current = systemUser;

  const load = useCallback(async (force = false) => {
    // Evita setar loading: true se já temos dados (evita flash nos guards)
    if (!force && loadedOnceRef.current && systemUserRef.current) {
      // Reload silencioso em background — não seta loading
    } else {
      setLoading(true);
    }
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("conmedic_role");
      }
      setSystemUser(null);
      setLoading(false);
      loadedOnceRef.current = true;
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
      loadedOnceRef.current = true;
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
    loadedOnceRef.current = true;

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
    void load(true);

    // Re-carrega quando a sessão muda (login / logout)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        // Logout: limpa imediatamente
        setSystemUser(null);
        setLoading(false);
        loadedOnceRef.current = false;
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("conmedic_role");
        }
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        // Reload silencioso (não seta loading: true se já temos dados)
        void load();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [load]);

  return (
    <SystemUserContext.Provider value={{ loading, systemUser, error, reload: () => void load(true) }}>
      {children}
    </SystemUserContext.Provider>
  );
}

export function useSystemUserContext() {
  return useContext(SystemUserContext);
}
