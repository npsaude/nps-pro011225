import { supabase } from "@/integrations/supabase/client";
import type { Clinica } from "./clinicas-service";

export interface GuiaFaturamentoHonorarios {
  id: string;
  nome_guia: string;
  clinica_id: string | null;
  html_documento: string | null;
  arquivo_modelo_path: string | null;
  created_at: string;
  updated_at: string;
  clinica?: Clinica | null;
}

export type GftInput = {
  nome_guia: string;
  clinica_id: string | null;
  html_documento: string | null;
  arquivo_modelo_path: string | null;
};

export async function listarGuiasFaturamento(): Promise<GuiaFaturamentoHonorarios[]> {
  const { data, error } = await supabase
    .from("modelo_guia_faturamento")
    .select(`
      *,
      clinica:clinicas(id, nome_fantasia, razao_social, tipo_unidade)
    `)
    .order("nome_guia", { ascending: true });

  if (error) {
    throw new Error(
      error.message || "Não foi possível carregar a lista de guias de faturamento."
    );
  }

  return (data ?? []) as GuiaFaturamentoHonorarios[];
}

export async function buscarGuiaFaturamentoPorId(
  id: string
): Promise<GuiaFaturamentoHonorarios | null> {
  const { data, error } = await supabase
    .from("modelo_guia_faturamento")
    .select(`
      *,
      clinica:clinicas(id, nome_fantasia, razao_social, tipo_unidade)
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(
      error.message || "Não foi possível buscar a guia de faturamento."
    );
  }

  return data as GuiaFaturamentoHonorarios;
}

export async function criarGuiaFaturamento(
  payload: GftInput
): Promise<GuiaFaturamentoHonorarios> {
  const { data, error } = await supabase
    .from("modelo_guia_faturamento")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message || "Não foi possível cadastrar a guia de faturamento."
    );
  }

  return data as GuiaFaturamentoHonorarios;
}

export async function atualizarGuiaFaturamento(
  id: string,
  payload: Partial<GftInput>
): Promise<GuiaFaturamentoHonorarios> {
  const { data, error } = await supabase
    .from("modelo_guia_faturamento")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message || "Não foi possível atualizar a guia de faturamento."
    );
  }

  return data as GuiaFaturamentoHonorarios;
}

export async function excluirGuiaFaturamento(id: string): Promise<void> {
  // Primeiro buscar a guia para verificar se tem arquivo
  const guia = await buscarGuiaFaturamentoPorId(id);
  
  // Se tiver arquivo, excluir do storage
  if (guia?.arquivo_modelo_path) {
    await supabase.storage
      .from("gft-modelos")
      .remove([guia.arquivo_modelo_path]);
  }

  const { error } = await supabase
    .from("modelo_guia_faturamento")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      error.message || "Não foi possível excluir a guia de faturamento."
    );
  }
}

export async function uploadArquivoModelo(
  file: File,
  guiaId: string
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${guiaId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("gft-modelos")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      uploadError.message || "Não foi possível fazer upload do arquivo modelo."
    );
  }

  // Atualizar o registro com o path do arquivo
  await atualizarGuiaFaturamento(guiaId, {
    arquivo_modelo_path: fileName,
  });

  return fileName;
}

export async function getArquivoModeloUrl(path: string): Promise<string> {
  const { data } = await supabase.storage
    .from("gft-modelos")
    .createSignedUrl(path, 3600); // URL válida por 1 hora

  if (!data?.signedUrl) {
    throw new Error("Não foi possível gerar URL do arquivo.");
  }

  return data.signedUrl;
}

export async function excluirArquivoModelo(
  guiaId: string,
  filePath: string
): Promise<void> {
  const { error: deleteError } = await supabase.storage
    .from("gft-modelos")
    .remove([filePath]);

  if (deleteError) {
    throw new Error(
      deleteError.message || "Não foi possível excluir o arquivo modelo."
    );
  }

  // Atualizar o registro removendo o path do arquivo
  await atualizarGuiaFaturamento(guiaId, {
    arquivo_modelo_path: null,
  });
}
