import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/** Linha editada pela Guia de Autorização (tabela `faturamentos`). */
export type GuiaAutorizacaoRow = Tables<"faturamentos">;

/**
 * Camada de dados da Guia de Autorização. Centraliza o acesso à tabela
 * `faturamentos` usado pela página de formulário admin.
 */

/** Carrega o faturamento/guia por id. Retorna null se não encontrado. */
export async function fetchGuiaAutorizacao(
  id: string,
): Promise<GuiaAutorizacaoRow | null> {
  const { data, error } = await supabase
    .from("faturamentos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as GuiaAutorizacaoRow;
}

/** Lê os paths de documentos (coluna `url_guia_autorizacao`) por id. */
export async function fetchGuiaAutorizacaoDocPaths(id: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("faturamentos")
    .select("url_guia_autorizacao")
    .eq("id", id)
    .single();

  if (error || !data) return [];
  return Array.isArray(data.url_guia_autorizacao)
    ? (data.url_guia_autorizacao as string[])
    : [];
}

/** Insere um novo registro ou atualiza o existente (quando `id` é informado). */
export async function saveGuiaAutorizacao(
  payload: Record<string, unknown>,
  id?: string,
): Promise<{ error: { message: string } | null }> {
  if (id) {
    const { error } = await supabase
      .from("faturamentos")
      .update(payload)
      .eq("id", id);
    return { error };
  }

  const { error } = await supabase.from("faturamentos").insert(payload);
  return { error };
}
