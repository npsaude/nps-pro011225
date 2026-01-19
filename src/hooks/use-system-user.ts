import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DbSystemUser } from "@/db/schema";

type State = {
  loading: boolean;
  systemUser: DbSystemUser | null;
  error: Error | null;
};

function normalizeSystemUser(user: any): DbSystemUser {
  return {
    ...(user as DbSystemUser),
    email: String(user.email ?? "").trim(),
    regra: String(user.regra ?? "").toUpperCase() as DbSystemUser["regra"],
  };
}

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
        const { data: authData, error: authError } =
          await supabase.auth.getUser();
        if (authError) throw authError;

        const uid = authData.user?.id ?? null;
        const authEmail = authData.user?.email?.trim() ?? null;

        if (!uid) {
          if (!cancelled) {
            setState({ loading: false, systemUser: null, error: null });
          }
          return;
        }

        // 1) Primeiro tenta pelo vínculo canônico: id_user = auth.uid()
        const { data: byId, error: byIdError } = await supabase
          .from("usuarios_sistema")
          .select("*")
          .eq("id_user", uid)
          .maybeSingle();

        if (byIdError) throw byIdError;

        let systemUser = byId as DbSystemUser | null;

        // 2) Se não encontrou por id_user, tenta por e-mail (case-insensitive)
        // e, se possível, auto-corrige o id_user para o auth.uid().
        if (!systemUser && authEmail) {
          const { data: byEmail, error: byEmailError } = await supabase
            .from("usuarios_sistema")
            .select("*")
            .ilike("email", authEmail)
            .maybeSingle();

          if (byEmailError) throw byEmailError;

          if (byEmail) {
            const normalized = normalizeSystemUser(byEmail);

            if (normalized.id_user && normalized.id_user !== uid) {
              const { data: updated, error: updateError } = await supabase
                .from("usuarios_sistema")
                .update({ id_user: uid })
                .eq("email", byEmail.email)
                .select("*")
                .maybeSingle();

              // Se a atualização falhar por alguma política, não bloqueia o acesso do front-end:
              // mantemos o registro encontrado por e-mail para permitir a UI refletir o papel.
              if (!updateError && updated) {
                systemUser = normalizeSystemUser(updated);
              } else {
                systemUser = normalized;
              }
            } else {
              systemUser = normalized;
            }
          }
        }

        if (!cancelled) {
          setState({
            loading: false,
            systemUser: systemUser ? normalizeSystemUser(systemUser) : null,
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