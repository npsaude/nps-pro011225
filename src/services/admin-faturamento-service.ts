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
  valorFaturamento: number;
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
};

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
    .select("faturamento_id,descricao_procedimento,codigo_procedimento,quantidade,quantidade_autorizada,valor_unitario")
    .in("faturamento_id", faturamentoIds);

  if (itensFatError) throw itensFatError;

  // 4. Buscar itens_guia_solicitacao (se houver guias)
  let itensSol: ItemGuiaSolicitacaoRow[] = [];
  if (guiaSolicitacaoIds.length > 0) {
    const { data: solData, error: solError } = await supabase
      .from("itens_guia_solicitacao")
      .select("guia_id,codigo_procedimento,descricao_procedimento,quantidade,valor_unitario")
      .in("guia_id", guiaSolicitacaoIds);

    if (solError) throw solError;
    itensSol = (solData ?? []) as ItemGuiaSolicitacaoRow[];
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
      0
    );

    // Itens solicitados
    const itensSolicitados = fat.guia_solicitacao_id
      ? itensSolByGuia.get(fat.guia_solicitacao_id) ?? []
      : [];

    // Quantidade solicitada total
    const qtdSolicitada = itensSolicitados.reduce(
      (sum, item) => sum + (item.quantidade ?? 1),
      0
    );

    // Valor de faturamento: para cada item solicitado, min(qtd_solicitada, qtd_autorizada) * valor_unitario
    // Mapear autorizados por código
    const autorizadosPorCodigo = new Map<string, { qtdAutorizada: number; valorUnitario: number }>();
    for (const item of itensAutorizados) {
      const codigo = item.codigo_procedimento ?? "";
      const existing = autorizadosPorCodigo.get(codigo);
      const qtdAut = item.quantidade_autorizada ?? item.quantidade ?? 1;
      const valor = Number(item.valor_unitario) || 0;
      if (existing) {
        existing.qtdAutorizada += qtdAut;
        // Manter o maior valor unitário ou somar? Vamos usar o valor do item
      } else {
        autorizadosPorCodigo.set(codigo, { qtdAutorizada: qtdAut, valorUnitario: valor });
      }
    }

    let valorFaturamento = 0;
    if (itensSolicitados.length > 0) {
      // Calcular baseado nos itens solicitados
      for (const itemSol of itensSolicitados) {
        const codigo = itemSol.codigo_procedimento ?? "";
        const qtdSol = itemSol.quantidade ?? 1;
        const autorizado = autorizadosPorCodigo.get(codigo);
        
        if (autorizado && autorizado.qtdAutorizada > 0) {
          const qtdFaturar = Math.min(qtdSol, autorizado.qtdAutorizada);
          const valorUnit = autorizado.valorUnitario || Number(itemSol.valor_unitario) || 0;
          valorFaturamento += qtdFaturar * valorUnit;
          // Decrementar a quantidade autorizada usada
          autorizado.qtdAutorizada -= qtdFaturar;
        }
      }
    } else {
      // Se não há itens solicitados, usar o total dos itens autorizados
      valorFaturamento = itensAutorizados.reduce(
        (sum, item) => sum + (item.quantidade_autorizada ?? item.quantidade ?? 1) * (Number(item.valor_unitario) || 0),
        0
      );
    }

    return {
      id: fat.id,
      paciente_nome: fat.paciente_nome,
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