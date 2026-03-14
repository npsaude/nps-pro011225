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
  // Novos campos de resumo
  procedimentos: string[];
  profissionais: string[];
  qtdSolicitada: number;
  qtdAutorizada: number;
  valorFaturamento: number | null; // null quando não há guia de solicitação
};

type FaturamentoRow = {
  id: string;
  paciente_nome: string | null;
  data_cirurgia: string | null;
  hora_inicio: string | null;
  hospital_nome: string | null;
  url_guia_autorizacao: string[];
  url_descricao_cirurgica: string[];
  email_status: string;
  guia_solicitacao_id: string | null;
  guia_honorarios_id: string | null;
  cirurgiao_principal_nome: string | null;
  auxiliar1_nome: string | null;
  auxiliar2_nome: string | null;
  auxiliar3_nome: string | null;
  anestesista_nome: string | null;
};

type ItemFaturamentoRow = {
  faturamento_id: string;
  descricao_procedimento: string | null;
  codigo_procedimento: string | null;
  quantidade: number;
  quantidade_autorizada: number | null;
  valor_unitario: number;
};

type ItemGuiaSolicitacaoRow = {
  guia_id: string;
  codigo_procedimento: string | null;
  descricao_procedimento: string | null;
  quantidade: number | null;
  valor_unitario: number | null;
  valor_total: number | null;
};

type GuiaSolicitacaoRow = {
  id: string;
  nome_beneficiario: string | null;
};

function hasAny(arr: string[] | null | undefined): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

export async function listAdminFaturamentos(): Promise<AdminFaturamentoListItem[]> {
  // 1. Buscar faturamentos com campos de profissionais
  const { data: faturamentos, error: fatError } = await supabase
    .from("faturamentos")
    .select(
      "id,paciente_nome,data_cirurgia,hora_inicio,hospital_nome,url_guia_autorizacao,url_descricao_cirurgica,email_status,guia_solicitacao_id,guia_honorarios_id,cirurgiao_principal_nome,auxiliar1_nome,auxiliar2_nome,auxiliar3_nome,anestesista_nome",
    )
    .order("created_at", { ascending: false });

  if (fatError) throw fatError;
  if (!faturamentos || faturamentos.length === 0) return [];

  const rows = faturamentos as FaturamentoRow[];

  // 2. Coletar IDs para buscar itens
  const faturamentoIds = rows.map((r) => r.id);
  const guiaSolicitacaoIds = rows
    .map((r) => r.guia_solicitacao_id)
    .filter((id): id is string => Boolean(id));

  // 3. Buscar itens_faturamento
  const { data: itensFat, error: itensFatError } = await supabase
    .from("itens_faturamento")
    .select(
      "faturamento_id,descricao_procedimento,codigo_procedimento,quantidade,quantidade_autorizada,valor_unitario",
    )
    .in("faturamento_id", faturamentoIds);

  if (itensFatError) throw itensFatError;

  // 4. Buscar itens_guia_solicitacao e dados da guia (se houver guias)
  let itensSol: ItemGuiaSolicitacaoRow[] = [];
  let guiasSol: GuiaSolicitacaoRow[] = [];
  if (guiaSolicitacaoIds.length > 0) {
    const [{ data: solData, error: solError }, { data: guiaData, error: guiaError }] =
      await Promise.all([
        supabase
          .from("itens_guia_solicitacao")
          .select(
            "guia_id,codigo_procedimento,descricao_procedimento,quantidade,valor_unitario,valor_total",
          )
          .in("guia_id", guiaSolicitacaoIds),
        supabase
          .from("guia_solicitacao")
          .select("id,nome_beneficiario")
          .in("id", guiaSolicitacaoIds),
      ]);

    if (solError) throw solError;
    if (guiaError) throw guiaError;

    itensSol = (solData ?? []) as ItemGuiaSolicitacaoRow[];
    guiasSol = (guiaData ?? []) as GuiaSolicitacaoRow[];
  }

  const nomeBeneficiarioByGuiaId = new Map<string, string | null>();
  for (const g of guiasSol) {
    nomeBeneficiarioByGuiaId.set(g.id, g.nome_beneficiario);
  }

  // 5. Indexar itens por faturamento_id e guia_id
  const itensFatByFat = new Map<string, ItemFaturamentoRow[]>();
  for (const item of (itensFat ?? []) as ItemFaturamentoRow[]) {
    const list = itensFatByFat.get(item.faturamento_id) ?? [];
    list.push(item);
    itensFatByFat.set(item.faturamento_id, list);
  }

  const itensSolByGuia = new Map<string, ItemGuiaSolicitacaoRow[]>();
  for (const item of itensSol) {
    const list = itensSolByGuia.get(item.guia_id) ?? [];
    list.push(item);
    itensSolByGuia.set(item.guia_id, list);
  }

  // 6. Montar resultado enriquecido
  return rows.map((fat) => {
    // Profissionais
    const profissionais: string[] = [];
    if (fat.cirurgiao_principal_nome?.trim()) {
      profissionais.push(`${fat.cirurgiao_principal_nome.trim()} (Cirurgião)`);
    }
    if (fat.auxiliar1_nome?.trim()) {
      profissionais.push(`${fat.auxiliar1_nome.trim()} (1º Aux.)`);
    }
    if (fat.auxiliar2_nome?.trim()) {
      profissionais.push(`${fat.auxiliar2_nome.trim()} (2º Aux.)`);
    }
    if (fat.auxiliar3_nome?.trim()) {
      profissionais.push(`${fat.auxiliar3_nome.trim()} (3º Aux.)`);
    }
    if (fat.anestesista_nome?.trim()) {
      profissionais.push(`${fat.anestesista_nome.trim()} (Anestesista)`);
    }

    // Itens do faturamento (autorizados)
    const itensAutorizados = itensFatByFat.get(fat.id) ?? [];

    // Procedimentos únicos (descrições)
    const procedimentosSet = new Set<string>();
    for (const item of itensAutorizados) {
      if (item.descricao_procedimento?.trim()) {
        procedimentosSet.add(item.descricao_procedimento.trim());
      }
    }
    const procedimentos = Array.from(procedimentosSet);

    // Quantidade autorizada total
    const qtdAutorizada = itensAutorizados.reduce(
      (sum, item) => sum + (item.quantidade_autorizada ?? item.quantidade ?? 1),
      0,
    );

    // Itens solicitados
    const itensSolicitados = fat.guia_solicitacao_id
      ? itensSolByGuia.get(fat.guia_solicitacao_id) ?? []
      : [];

    // Quantidade solicitada total
    const qtdSolicitada = itensSolicitados.reduce(
      (sum, item) => sum + (item.quantidade ?? 1),
      0,
    );

    // Valor de faturamento: usar valor_total dos itens solicitados
    // Se não há guia de solicitação, retornar null
    let valorFaturamento: number | null = null;
    if (itensSolicitados.length > 0) {
      // Usar o valor_total diretamente dos itens solicitados
      valorFaturamento = 0;
      for (const itemSol of itensSolicitados) {
        const valorTotal = Number(itemSol.valor_total) || 0;
        valorFaturamento += valorTotal;
      }
    }

    // Nome do paciente: quando a guia de autorização não foi enviada,
    // preferir o nome do beneficiário da guia de solicitação.
    const guiaAutorizacaoEnviada = hasAny(fat.url_guia_autorizacao);
    const nomeBeneficiario = fat.guia_solicitacao_id
      ? nomeBeneficiarioByGuiaId.get(fat.guia_solicitacao_id) ?? null
      : null;

    let pacienteNome = fat.paciente_nome;
    if (!guiaAutorizacaoEnviada) {
      const fallback = nomeBeneficiario?.trim() || null;
      if (fallback) pacienteNome = fallback;
    }

    return {
      id: fat.id,
      paciente_nome: pacienteNome,
      data_cirurgia: fat.data_cirurgia,
      hora_inicio: fat.hora_inicio,
      hospital_nome: fat.hospital_nome,
      url_guia_autorizacao: fat.url_guia_autorizacao,
      url_descricao_cirurgica: fat.url_descricao_cirurgica,
      email_status: fat.email_status,
      guia_solicitacao_id: fat.guia_solicitacao_id,
      guia_honorarios_id: fat.guia_honorarios_id,
      procedimentos,
      profissionais,
      qtdSolicitada,
      qtdAutorizada,
      valorFaturamento,
    };
  });
}

export async function deleteFaturamento(id: string): Promise<void> {
  const { error } = await supabase.from("faturamentos").delete().eq("id", id);
  if (error) {
    throw error;
  }
}