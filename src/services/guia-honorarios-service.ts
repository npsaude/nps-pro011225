import { supabase } from "@/integrations/supabase/client";

// Linha da tabela guia_honorarios. Acesso flexível para preservar o
// comportamento não-tipado usado antes na página.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GuiaHonorariosRow = Record<string, any>;

/**
 * Camada de dados da Guia de Honorários (tabela `guia_honorarios`).
 */

/** Carrega a guia completa por id. Retorna null se não encontrada. */
export async function fetchGuiaHonorarios(
  id: string,
): Promise<GuiaHonorariosRow | null> {
  const { data, error } = await supabase
    .from("guia_honorarios")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as GuiaHonorariosRow;
}

/**
 * Carrega apenas o campo pdf_guia_honorario (usado para listar/abrir os
 * documentos anexados). Retorna a linha (com o campo) ou null.
 */
export async function fetchGuiaHonorariosPdfField(
  id: string,
): Promise<GuiaHonorariosRow | null> {
  const { data, error } = await supabase
    .from("guia_honorarios")
    .select("pdf_guia_honorario")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as GuiaHonorariosRow;
}

/** Insere uma nova guia ou atualiza a existente (quando `id` é informado). */
export async function saveGuiaHonorarios(
  payload: Record<string, unknown>,
  id?: string,
): Promise<{ error: { message: string } | null }> {
  if (id) {
    const { error } = await supabase
      .from("guia_honorarios")
      .update(payload)
      .eq("id", id);
    return { error };
  }

  const { error } = await supabase.from("guia_honorarios").insert(payload);
  return { error };
}
