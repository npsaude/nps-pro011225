import { supabase } from "@/integrations/supabase/client";

export interface Medico {
  id: string;
  nome: string;
  email: string;
  telefone_whatsapp: string | null;
  crm: string | null;
  clinicas_ids: string[]; // lista de IDs de clínicas vinculadas
  created_at: string;
  updated_at: string;
}

export type MedicoInput = {
  id: string;
  nome: string;
  email: string;
  telefone_whatsapp: string | null;
  crm: string | null;
  clinicas_ids: string[];
};

export async function listarMedicos(): Promise<Medico[]> {
  const { data, error } = await supabase
    .from("medicos")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(
      error.message || "Não foi possível carregar a lista de médicos.",
    );
  }

  return (data ?? []) as Medico[];
}

export async function salvarMedico(
  payload: MedicoInput,
): Promise<Medico> {
  // upsert pela PK "id" (mesmo id do usuarios_sistema com regra MEDICO)
  const { data, error } = await supabase
    .from("medicos")
    .upsert(
      {
        id: payload.id,
        nome: payload.nome,
        email: payload.email,
        telefone_whatsapp: payload.telefone_whatsapp,
        crm: payload.crm,
        clinicas_ids: payload.clinicas_ids,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message || "Não foi possível salvar o cadastro do médico.",
    );
  }

  return data as Medico;
}