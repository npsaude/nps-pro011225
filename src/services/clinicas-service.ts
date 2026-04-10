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
  email_contato_faturamento_secundario: string | null;
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
  const { error } = await supabase
    .from("clinicas")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      error.message || "Não foi possível atualizar a clínica/hospital.",
    );
  }

  const { data, error: fetchError } = await supabase
    .from("clinicas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(
      fetchError.message || "A clínica/hospital foi atualizada, mas não pôde ser recarregada.",
    );
  }

  if (!data) {
    throw new Error("A clínica/hospital foi atualizada, mas não foi encontrada para recarregar.");
  }

  return data as Clinica;
}

export async function listarFavoritos(): Promise<string[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];

  const { data, error } = await supabase
    .from("medicos_clinicas_favoritas")
    .select("clinica_id")
    .eq("medico_id", authData.user.id);

  if (error) {
    console.error("Erro ao carregar favoritos:", error);
    return [];
  }

  return (data ?? []).map(row => row.clinica_id);
}

export async function favoritarClinica(clinicaId: string): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Usuário não autenticado");

  const { error } = await supabase
    .from("medicos_clinicas_favoritas")
    .insert({
      medico_id: authData.user.id,
      clinica_id: clinicaId
    });

  if (error) {
    throw new Error(error.message || "Não foi possível favoritar a instituição.");
  }
}

export async function desfavoritarClinica(clinicaId: string): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Usuário não autenticado");

  const { error } = await supabase
    .from("medicos_clinicas_favoritas")
    .delete()
    .eq("medico_id", authData.user.id)
    .eq("clinica_id", clinicaId);

  if (error) {
    throw new Error(error.message || "Não foi possível remover o favorito.");
  }
}