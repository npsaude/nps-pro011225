import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RecoveryState =
  | { status: "checking"; error: null }
  | { status: "ready"; error: null }
  | { status: "error"; error: string };

function clearUrlAuthParams() {
  const url = new URL(window.location.href);

  // Remove PKCE code
  if (url.searchParams.has("code")) {
    url.searchParams.delete("code");
  }

  // Remove OTP params sometimes forwarded to redirect URL
  if (url.searchParams.has("token")) {
    url.searchParams.delete("token");
  }
  if (url.searchParams.has("token_hash")) {
    url.searchParams.delete("token_hash");
  }
  if (url.searchParams.has("type")) {
    url.searchParams.delete("type");
  }

  window.history.replaceState({}, document.title, url.pathname + url.search);

  // Remove implicit flow hash tokens
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

    const setErr = (message: string) => {
      if (!cancelled) setState({ status: "error", error: message });
    };

    const run = async () => {
      const { data: initial } = await supabase.auth.getSession();
      if (initial.session) {
        if (!cancelled) setState({ status: "ready", error: null });
        return;
      }

      const url = new URL(window.location.href);

      // 1) PKCE flow: ?code=...
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setErr(
            error.message ||
              "Link de recuperação inválido ou expirado. Solicite um novo.",
          );
          return;
        }
        clearUrlAuthParams();
      } else {
        // 2) OTP forwarded to redirect: ?token_hash=...&type=recovery (or token=...)
        const type = url.searchParams.get("type");
        const tokenHash =
          url.searchParams.get("token_hash") ?? url.searchParams.get("token");

        if (type === "recovery" && tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });

          if (error) {
            setErr(
              error.message ||
                "Link de recuperação inválido ou expirado. Solicite um novo.",
            );
            return;
          }

          clearUrlAuthParams();
        } else {
          // 3) Implicit flow: #access_token=...&refresh_token=...
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
              setErr(
                error.message ||
                  "Link de recuperação inválido ou expirado. Solicite um novo.",
              );
              return;
            }

            clearUrlAuthParams();
          }
        }
      }

      const { data: after } = await supabase.auth.getSession();
      if (!after.session) {
        setErr(
          "Não foi possível validar o link de recuperação. Solicite um novo e-mail de cadastro/recuperação.",
        );
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