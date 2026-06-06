import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Camada de dados do formulário admin de Modelos de Descrição Cirúrgica.
// Centraliza o acesso à tabela `modelos_descricao_cirurgica` e ao storage,
// tirando as chamadas diretas ao Supabase de dentro da página.

const BUCKET = "NPS-pro";
const TABLE = "modelos_descricao_cirurgica";

// Linha da tabela `modelos_descricao_cirurgica` (tipo gerado do schema).
export type ModeloDescricaoCirurgicaRow = Tables<"modelos_descricao_cirurgica">;

/** Carrega um modelo por id. Retorna null se não encontrado. */
export async function fetchModeloDescricaoCirurgica(
  id: string,
): Promise<ModeloDescricaoCirurgicaRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as ModeloDescricaoCirurgicaRow;
}

/** Gera uma signed URL (1h) para uma imagem do modelo. Null em falha. */
export async function createSignedModeloImageUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Faz upload de uma imagem do modelo e retorna o path gerado. */
export async function uploadModeloImage(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `modelos_descricao_cirurgica/${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(`Erro ao fazer upload: ${error.message}`);
  return path;
}

/** Insere um novo modelo ou atualiza o existente (quando `id` é informado). */
export async function saveModeloDescricaoCirurgica(
  payload: Record<string, unknown>,
  id?: string,
): Promise<{ error: { message: string } | null }> {
  if (id) {
    const { error } = await supabase.from(TABLE).update(payload).eq("id", id);
    return { error };
  }

  const { error } = await supabase.from(TABLE).insert(payload);
  return { error };
}
