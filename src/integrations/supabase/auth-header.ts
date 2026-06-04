import { supabase } from "./client";

/**
 * Monta os headers para chamadas HTTP a edge functions, anexando o JWT do
 * usuário autenticado (quando houver sessão). Use em chamadas `fetch` diretas
 * às functions para que o servidor possa verificar a identidade do usuário —
 * `supabase.functions.invoke` já faz isso automaticamente.
 */
export async function authHeaders(
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}
