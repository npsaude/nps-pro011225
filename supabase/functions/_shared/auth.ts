// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Deriva o ID do usuário autenticado a partir do JWT presente no header
 * Authorization (Bearer). Valida o token usando a anon key. Retorna null se
 * não houver token válido.
 *
 * Os clientes do app chamam as edge functions via supabase.functions.invoke,
 * que anexa automaticamente o JWT do usuário logado — então este header estará
 * presente nas chamadas legítimas.
 */
export async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !anonKey) {
    console.error("[auth] SUPABASE_URL ou SUPABASE_ANON_KEY não configurados.");
    return null;
  }

  try {
    const client = createClient(supabaseUrl, anonKey);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch (e) {
    console.error("[auth] Falha ao validar JWT:", e);
    return null;
  }
}

/**
 * Resolve o userId efetivo de uma requisição.
 *
 * - Se houver um usuário autenticado pelo JWT, ESSE id é usado (caminho seguro);
 *   um eventual userId divergente no body é ignorado (e logado).
 * - Se NÃO houver JWT válido, cai para o userId do body apenas como
 *   compatibilidade temporária com clientes antigos, registrando um aviso.
 *
 * IMPORTANTE (endurecimento futuro): depois que todos os clientes estiverem
 * publicados chamando via supabase.functions.invoke (JWT sempre presente),
 * remova o fallback abaixo e passe a rejeitar requisições sem JWT (401).
 */
export function resolveEffectiveUserId(
  authUserId: string | null,
  bodyUserId: string | null,
  fnName: string,
): string | null {
  if (authUserId) {
    if (bodyUserId && bodyUserId !== authUserId) {
      console.warn(
        `[${fnName}] body.userId difere do usuário do JWT; usando o do JWT (seguro).`,
      );
    }
    return authUserId;
  }
  if (bodyUserId) {
    console.warn(
      `[${fnName}] Sem JWT válido — usando body.userId (INSEGURO, descontinuado).`,
    );
    return bodyUserId;
  }
  return null;
}
