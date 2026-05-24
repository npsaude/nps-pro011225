import { supabase } from "@/integrations/supabase/client";

export interface RelatorioRetorno {
  id: string;
  user_id: string;
  arquivo_path: string | null;
  arquivo_nome: string | null;
  origem: string | null;
  clinica_hospital: string | null;
  medico_nome: string | null;
  medico_crm: string | null;
  medico_especialidade: string | null;
  medico_funcao: string | null;
  competencia: string | null;
  data_pagamento: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  total_bruto: number | null;
  total_glosa: number | null;
  total_desconto: number | null;
  total_imposto: number | null;
  total_liquido: number | null;
  raw_extracao: any;
  created_at: string;
  updated_at: string;
}

export interface ItemRelatorioRetorno {
  id: string;
  relatorio_id: string;
  user_id: string;
  paciente_nome: string | null;
  paciente_carteira: string | null;
  numero_guia: string | null;
  numero_conta: string | null;
  data_atendimento: string | null;
  data_realizacao: string | null;
  data_pagamento: string | null;
  convenio: string | null;
  plano: string | null;
  hospital_local: string | null;
  codigo_procedimento: string | null;
  descricao_procedimento: string | null;
  funcao_profissional: string | null;
  quantidade: number | null;
  valor_base: number | null;
  valor_apresentado: number | null;
  valor_glosa: number | null;
  motivo_glosa: string | null;
  valor_desconto: number | null;
  valor_imposto: number | null;
  valor_liquido: number | null;
  observacoes: string | null;
  ordem: number | null;
}

const BUCKET = "NPS-pro";
const PROCESS_FN_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-relatorio-retorno";

export async function listarRelatoriosRetorno(): Promise<RelatorioRetorno[]> {
  const { data, error } = await supabase
    .from("relatorios_retorno")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RelatorioRetorno[];
}

export async function listarItensDoRelatorio(
  relatorioId: string,
): Promise<ItemRelatorioRetorno[]> {
  const { data, error } = await supabase
    .from("itens_relatorio_retorno")
    .select("*")
    .eq("relatorio_id", relatorioId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ItemRelatorioRetorno[];
}

/**
 * Item enriquecido com dados do cabeçalho do relatório de origem
 * (usado para listar todos os itens em uma única tabela).
 */
export interface ItemRelatorioComCabecalho extends ItemRelatorioRetorno {
  relatorio_origem: string | null;
  relatorio_clinica_hospital: string | null;
  relatorio_medico_nome: string | null;
  relatorio_competencia: string | null;
  relatorio_arquivo_nome: string | null;
  relatorio_created_at: string | null;
}

export async function listarTodosItensRetorno(): Promise<
  ItemRelatorioComCabecalho[]
> {
  const { data, error } = await supabase
    .from("itens_relatorio_retorno")
    .select(
      `
        *,
        relatorios_retorno:relatorio_id (
          origem,
          clinica_hospital,
          medico_nome,
          competencia,
          arquivo_nome,
          created_at
        )
      `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as any[]).map((row) => {
    const rel = row.relatorios_retorno ?? {};
    return {
      ...(row as ItemRelatorioRetorno),
      relatorio_origem: rel.origem ?? null,
      relatorio_clinica_hospital: rel.clinica_hospital ?? null,
      relatorio_medico_nome: rel.medico_nome ?? null,
      relatorio_competencia: rel.competencia ?? null,
      relatorio_arquivo_nome: rel.arquivo_nome ?? null,
      relatorio_created_at: rel.created_at ?? null,
    } as ItemRelatorioComCabecalho;
  });
}

export async function excluirItemRelatorioRetorno(id: string): Promise<void> {
  const { error } = await supabase
    .from("itens_relatorio_retorno")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function excluirRelatorioRetorno(id: string): Promise<void> {
  const { error } = await supabase
    .from("relatorios_retorno")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/**
 * Faz upload do PDF e chama a edge function de processamento.
 * A edge function valida se o médico do relatório é o usuário logado;
 * se não for, retorna erro 422 e NÃO grava nada.
 */
export async function importarRelatorioRetorno(params: {
  file: File;
  userId: string;
  expectedMedicoNome?: string;
  expectedMedicoEmail?: string;
}): Promise<{
  success: boolean;
  relatorio_id?: string;
  total_itens?: number;
  medico_relatorio?: string | null;
  medico_esperado?: string | null;
  error?: string;
}> {
  const { file, userId, expectedMedicoNome, expectedMedicoEmail } = params;

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const ts = Date.now();
  const filePath = `relatorios_retorno/${userId}/${ts}-${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (uploadErr) {
    return { success: false, error: `Falha no upload: ${uploadErr.message}` };
  }

  // Pega o access token da sessão para autorizar a edge function
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const resp = await fetch(PROCESS_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      userId,
      filePath,
      fileName: file.name,
      expectedMedicoNome,
      expectedMedicoEmail,
    }),
  });

  let json: any = null;
  try {
    json = await resp.json();
  } catch {
    // ignore
  }

  if (!resp.ok || json?.error) {
    // Se a edge function rejeitou, tenta limpar o arquivo do storage
    try {
      await supabase.storage.from(BUCKET).remove([filePath]);
    } catch {
      // ignore
    }
    return {
      success: false,
      error: json?.error ?? `Erro HTTP ${resp.status}`,
      medico_relatorio: json?.medico_relatorio ?? null,
      medico_esperado: json?.medico_esperado ?? null,
    };
  }

  return {
    success: true,
    relatorio_id: json?.relatorio_id,
    total_itens: json?.total_itens ?? 0,
    medico_relatorio: json?.medico_relatorio ?? null,
    medico_esperado: json?.medico_esperado ?? null,
  };
}

export function formatBRL(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateBR(s: string | null | undefined): string {
  if (!s) return "—";
  // YYYY-MM-DD ou ISO
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}
