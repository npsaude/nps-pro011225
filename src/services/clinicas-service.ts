import { supabase } from "@/integrations/supabase/client";

export type TipoUnidade = "CLINICA" | "HOSPITAL";

export interface Clinica {
  id: string;
  tipo_unidade: TipoUnidade;
  codigo_referencial_got: string | null;
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

export type ClinicaInput = Omit<
  Clinica,
  "id" | "created_at" | "updated_at"
>;

export async function listarClinicas(): Promise<Clinica[]> {
  const { data, error } = await supabase
    .from("clinicas")
    .select("*")
    .order("razao_social", { ascending: true });

  if (error) {
    throw new Error(
      error.message || "Não foi possível carregar a lista de clínicas/hospitais.",
    );
  }

  return (data ?? []) as Clinica[];
}

export async function criarClinica(
  payload: ClinicaInput,
): Promise<Clinica> {
  const { data, error } = await supabase
    .from("clinicas")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message || "Não foi possível cadastrar a clínica/hospital.",
    );
  }

  return data as Clinica;
}

export async function atualizarClinica(
  id: string,
  payload: Partial<ClinicaInput>,
): Promise<Clinica> {
  const { data, error } = await supabase
    .from("clinicas")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message || "Não foi possível atualizar a clínica/hospital.",
    );
  }

  return data as Clinica;
}