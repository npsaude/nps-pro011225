import { supabase } from "@/integrations/supabase/client";

export interface Hospital {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  nome_rede: string | null;
  cnpj: string;
  endereco: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string | null;
  contato: string | null;
  cargo: string | null;
  nome_contato_faturamento: string | null;
  email_contato_faturamento: string | null;
  telefone_contato_faturamento: string | null;
  created_at: string;
  updated_at: string;
}

export type HospitalInput = Omit<Hospital, "id" | "created_at" | "updated_at">;

export interface HospitalDocumentoEspecifico {
  id: string;
  hospital_id: string;
  nome_documento: string;
  file_path: string;
  created_at: string;
}

const BUCKET_NAME = "NPS-pro";

export async function listarHospitais(): Promise<Hospital[]> {
  const { data, error } = await supabase
    .from("hospitais")
    .select("*")
    .order("razao_social", { ascending: true });

  if (error) {
    throw new Error(
      error.message || "Não foi possível carregar a lista de hospitais.",
    );
  }

  return (data ?? []) as Hospital[];
}

export async function criarHospital(payload: HospitalInput): Promise<Hospital> {
  const { data, error } = await supabase
    .from("hospitais")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message || "Não foi possível cadastrar o hospital.",
    );
  }

  return data as Hospital;
}

export async function atualizarHospital(
  id: string,
  payload: Partial<HospitalInput>,
): Promise<Hospital> {
  const { data, error } = await supabase
    .from("hospitais")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message || "Não foi possível atualizar o hospital.",
    );
  }

  return data as Hospital;
}

export async function listarDocumentosEspecificos(
  hospitalId: string,
): Promise<HospitalDocumentoEspecifico[]> {
  const { data, error } = await supabase
    .from("hospitais_documentos_especificos")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível carregar os documentos específicos do hospital.",
    );
  }

  return (data ?? []) as HospitalDocumentoEspecifico[];
}

export async function uploadDocumentoEspecifico(
  hospitalId: string,
  nomeDocumento: string,
  file: File,
): Promise<HospitalDocumentoEspecifico> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const timestamp = Date.now();
  const filePath = `documentos_especificos/${hospitalId}/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      uploadError.message ||
        "Não foi possível enviar o documento específico para o storage.",
    );
  }

  const { data, error } = await supabase
    .from("hospitais_documentos_especificos")
    .insert({
      hospital_id: hospitalId,
      nome_documento: nomeDocumento,
      file_path: filePath,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ||
        "Documento enviado, mas não foi possível salvar o registro no banco.",
    );
  }

  return data as HospitalDocumentoEspecifico;
}