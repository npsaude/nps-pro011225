import { supabase } from "@/integrations/supabase/client";

// Linha editada pela Guia de Autorização (tabela `faturamentos`). Acesso
// flexível para preservar o comportamento não-tipado usado antes na página.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GuiaAutorizacaoRow = Record<string, any> & { id: string };

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
