import { supabase } from "@/integrations/supabase/client";

export type AdminFaturamentoListItem = {
  id: string;
  paciente_nome: string | null;
  data_cirurgia: string | null;
  hora_inicio: string | null;
  hospital_nome: string | null;
  url_guia_autorizacao: string[];
  url_descricao_cirurgica: string[];
  email_status: "NAO_ENVIADO" | "ENVIADO" | string;
  guia_solicitacao_id: string | null;
  guia_honorarios_id: string | null;
};

export async function listAdminFaturamentos(): Promise<AdminFaturamentoListItem[]> {
  const { data, error } = await supabase
    .from("faturamentos")
    .select(
      "id,paciente_nome,data_cirurgia,hora_inicio,hospital_nome,url_guia_autorizacao,url_descricao_cirurgica,email_status,guia_solicitacao_id,guia_honorarios_id",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as unknown as AdminFaturamentoListItem[];
}