import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/** Linha da tabela `guia_solicitacao` (tipo gerado do schema). */
export type GuiaSolicitacaoRow = Tables<"guia_solicitacao">;

/**
 * Camada de dados da Guia de Solicitação. Centraliza o acesso à tabela
 * `guia_solicitacao`, tirando as queries de dentro da página de formulário.
 */

/** Carrega uma guia de solicitação por id. Retorna null se não encontrada. */
export async function fetchGuiaSolicitacao(
  id: string,
): Promise<GuiaSolicitacaoRow | null> {
  const { data, error } = await supabase
    .from("guia_solicitacao")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as GuiaSolicitacaoRow;
}

/** Lê os paths de documentos (coluna `url_documentos`) de uma guia. */
export async function fetchGuiaSolicitacaoDocPaths(id: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("guia_solicitacao")
    .select("url_documentos")
    .eq("id", id)
    .single();

  if (error || !data) return [];
  return Array.isArray(data.url_documentos) ? (data.url_documentos as string[]) : [];
}

/**
 * Insere uma nova guia ou atualiza a existente (quando `id` é informado).
 * Retorna o erro do Supabase (ou null em sucesso), preservando o tratamento
 * feito pela página.
 */
export async function saveGuiaSolicitacao(
  payload: Record<string, unknown>,
  id?: string,
): Promise<{ error: { message: string } | null }> {
  if (id) {
    const { error } = await supabase
      .from("guia_solicitacao")
      .update(payload)
      .eq("id", id);
    return { error };
  }

  const { error } = await supabase.from("guia_solicitacao").insert(payload);
  return { error };
}
