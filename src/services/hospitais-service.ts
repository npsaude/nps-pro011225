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
  storage_folder: string | null;
  created_at: string;
  updated_at: string;
}

// No input não precisamos enviar storage_folder; ele será gerado automaticamente
export type HospitalInput = Omit<
  Hospital,
  "id" | "created_at" | "updated_at" | "storage_folder"
>;

export interface HospitalDocumentoEspecifico {
  id: string;
  hospital_id: string;
  nome_documento: string;
  file_path: string;
  created_at: string;
}

// ATENÇÃO: o nome do bucket precisa bater exatamente com o do Supabase (NPS-pro)
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

  // Pasta base do hospital no storage (pode ter vários arquivos dentro dela)
  const storageFolder = `documentos_especificos/Hospitais/${hospitalId}`;
  const filePath = `${storageFolder}/${timestamp}-${safeName}`;

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

  // Atualiza o cadastro do hospital para lembrar a pasta onde os arquivos ficam guardados
  const { error: hospitalUpdateError } = await supabase
    .from("hospitais")
    .update({
      storage_folder: storageFolder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", hospitalId);

  if (hospitalUpdateError) {
    throw new Error(
      hospitalUpdateError.message ||
        "Documento enviado, mas não foi possível atualizar a pasta de armazenamento do hospital.",
    );
  }

  return data as HospitalDocumentoEspecifico;
}