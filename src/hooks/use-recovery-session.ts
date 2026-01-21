import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RecoveryState =
  | { status: "checking"; error: null }
  | { status: "ready"; error: null }
  | { status: "error"; error: string };

function clearUrlAuthParams() {
  const url = new URL(window.location.href);
  if (url.searchParams.has("code")) {
    url.searchParams.delete("code");
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }

  if (window.location.hash) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

export function useRecoverySession() {
  const [state, setState] = useState<RecoveryState>({
    status: "checking",
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { data: initial } = await supabase.auth.getSession();
      if (initial.session) {
        if (!cancelled) setState({ status: "ready", error: null });
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (!cancelled)
            setState({
              status: "error",
              error:
                error.message ||
                "Link de recuperação inválido ou expirado. Solicite um novo.",
            });
          return;
        }

        clearUrlAuthParams();
      } else {
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : "";
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            if (!cancelled)
              setState({
                status: "error",
                error:
                  error.message ||
                  "Link de recuperação inválido ou expirado. Solicite um novo.",
              });
            return;
          }

          clearUrlAuthParams();
        }
      }

      const { data: after } = await supabase.auth.getSession();
      if (!after.session) {
        if (!cancelled)
          setState({
            status: "error",
            error:
              "Não foi possível validar o link de recuperação. Solicite um novo e-mail de cadastro/recuperação.",
          });
        return;
      }

      if (!cancelled) setState({ status: "ready", error: null });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ready: state.status === "ready",
    checking: state.status === "checking",
    error: state.status === "error" ? state.error : null,
  };
}