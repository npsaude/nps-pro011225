import { supabase } from "@/integrations/supabase/client";

const BUCKET = "NPS-pro";

export interface GftGuia {
  id: string;
  user_id: string;
  nome_guia: string;
  clinica_id: string;
  documento_html: string | null;
  modelo_arquivo_path: string | null;
  created_at: string;
  updated_at: string;
}

export type GftGuiaInput = Pick<
  GftGuia,
  "nome_guia" | "clinica_id" | "documento_html"
>;

async function getAuthUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id ?? null;
  if (!uid) throw new Error("Sessão expirada. Faça login novamente.");
  return uid;
}

export async function listarGuiasGft(): Promise<GftGuia[]> {
  const { data, error } = await supabase
    .from("gft_guias")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Não foi possível carregar as guias de GFT.");
  }

  return (data ?? []) as GftGuia[];
}

export async function criarGuiaGft(payload: GftGuiaInput): Promise<GftGuia> {
  const userId = await getAuthUserId();

  const { data, error } = await supabase
    .from("gft_guias")
    .insert({
      user_id: userId,
      nome_guia: payload.nome_guia,
      clinica_id: payload.clinica_id,
      documento_html: payload.documento_html ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível criar a guia de GFT.");
  }

  return data as GftGuia;
}

export async function atualizarGuiaGft(
  id: string,
  payload: Partial<GftGuiaInput>,
): Promise<GftGuia> {
  const { data, error } = await supabase
    .from("gft_guias")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível atualizar a guia de GFT.");
  }

  return data as GftGuia;
}

export async function excluirGuiaGft(id: string): Promise<void> {
  const { error } = await supabase.from("gft_guias").delete().eq("id", id);
  if (error) {
    throw new Error(error.message || "Não foi possível excluir a guia de GFT.");
  }
}

export async function uploadModeloGft(params: {
  guiaId: string;
  file: File;
}): Promise<{ path: string }> {
  const userId = await getAuthUserId();
  const { guiaId, file } = params;

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const timestamp = Date.now();
  const path = `gft_modelos/${userId}/${guiaId}/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      uploadError.message ||
        "Não foi possível enviar o arquivo modelo para o storage.",
    );
  }

  const { error: updateError } = await supabase
    .from("gft_guias")
    .update({
      modelo_arquivo_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guiaId);

  if (updateError) {
    throw new Error(
      updateError.message ||
        "Arquivo enviado, mas não foi possível salvar a referência no banco.",
    );
  }

  return { path };
}

export async function criarModeloSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;

  const signedUrl = data?.signedUrl ?? null;
  if (!signedUrl) {
    throw new Error("Não foi possível obter URL assinada do modelo.");
  }
  return signedUrl;
}
