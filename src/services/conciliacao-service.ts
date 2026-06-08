import { supabase } from "@/integrations/supabase/client";
import {
  listarTodosItensRetorno,
  type ItemRelatorioComCabecalho,
} from "@/services/relatorios-retorno-service";

/**
 * Conciliação (encontro de contas) entre as guias de acompanhamento
 * (SADT) e os relatórios de repasse importados.
 *
 * Como o número da guia frequentemente não vem preenchido no relatório de
 * repasse, o matcher é híbrido: tenta casar por número de guia normalizado e,
 * na ausência, cai para o nome normalizado do paciente/beneficiário.
 */

export type ConciliacaoStatus =
  | "aberto"
  | "pago_integral"
  | "pago_parcial"
  | "glosado_total";

export interface SadtGuia {
  id: string;
  numero_guia_prestador: string | null;
  numero_guia_sadt: string | null;
  numero_guia_operadora: string | null;
  nome_beneficiario: string | null;
  executante_nome: string | null;
  solicitante_nome: string | null;
  data_autorizacao: string | null;
  data_emissao: string | null;
  valor_total_geral: number | null;
  created_at: string;
}

export interface ConciliacaoRow {
  key: string;
  /** id da guia SADT, quando existe correspondência */
  guiaId: string | null;
  /** id do relatório de repasse de origem, quando existe */
  repasseId: string | null;
  numeroGuia: string | null;
  paciente: string | null;
  convenio: string | null;
  competencia: string | null;
  origemRepasse: string | null;
  dataPagamento: string | null;
  /** valor esperado (guia SADT) */
  valorEsperado: number | null;
  /** valor apresentado no repasse */
  valorApresentado: number | null;
  valorGlosa: number;
  /** valor efetivamente recebido (líquido) */
  valorLiquido: number;
  motivoGlosa: string | null;
  status: ConciliacaoStatus;
  temGlosa: boolean;
  matched: boolean;
  matchType: "guia" | "nome" | null;
  /** repasse encontrado mas sem guia de acompanhamento correspondente */
  semGuia: boolean;
  /** percentual recebido sobre o apresentado/esperado (0..1) */
  percentualRecebido: number;
  itens: number;
}

export interface ConciliacaoResumo {
  totalGuias: number;
  totalConciliadas: number;
  totalAbertas: number;
  totalComGlosa: number;
  totalPagoIntegral: number;
  totalPagoParcial: number;
  totalGlosadoTotal: number;
  totalSemGuia: number;
  valorEsperado: number;
  valorApresentado: number;
  valorRecebido: number;
  valorGlosa: number;
  valorEmAberto: number;
  taxaConciliacao: number; // 0..1
  taxaGlosa: number; // 0..1
}

const EPS = 0.01;

function normName(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function normNum(s: string | null | undefined): string {
  if (!s) return "";
  const digits = s.replace(/\D/g, "").replace(/^0+/, "");
  return digits;
}

function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

/** Grupo de itens de repasse agregados por guia/nome. */
interface RepasseGrupo {
  guides: Set<string>;
  names: Set<string>;
  apresentado: number;
  glosa: number;
  liquido: number;
  motivoGlosa: string | null;
  convenio: string | null;
  competencia: string | null;
  origem: string | null;
  dataPagamento: string | null;
  paciente: string | null;
  numeroGuia: string | null;
  repasseId: string | null;
  itens: number;
  consumido: boolean;
}

export async function listarGuiasAcompanhamento(): Promise<SadtGuia[]> {
  const { data, error } = await supabase
    .from("sadt_acompanhamento")
    .select(
      "id, numero_guia_prestador, numero_guia_sadt, numero_guia_operadora, nome_beneficiario, executante_nome, solicitante_nome, data_autorizacao, data_emissao, valor_total_geral, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SadtGuia[];
}

function agruparRepasse(itens: ItemRelatorioComCabecalho[]): RepasseGrupo[] {
  const map = new Map<string, RepasseGrupo>();

  for (const it of itens) {
    const guia = normNum(it.numero_guia) || normNum(it.numero_conta);
    const nome = normName(it.paciente_nome);
    const key = guia ? `g:${guia}` : nome ? `n:${nome}` : `id:${it.id}`;

    let grupo = map.get(key);
    if (!grupo) {
      grupo = {
        guides: new Set(),
        names: new Set(),
        apresentado: 0,
        glosa: 0,
        liquido: 0,
        motivoGlosa: null,
        convenio: it.convenio ?? null,
        competencia: it.relatorio_competencia ?? null,
        origem: it.relatorio_origem ?? it.relatorio_clinica_hospital ?? null,
        dataPagamento: it.data_pagamento ?? null,
        paciente: it.paciente_nome ?? null,
        numeroGuia: it.numero_guia ?? it.numero_conta ?? null,
        repasseId: it.relatorio_id ?? null,
        itens: 0,
        consumido: false,
      };
      map.set(key, grupo);
    }

    if (guia) grupo.guides.add(guia);
    if (nome) grupo.names.add(nome);
    grupo.apresentado += toNum(it.valor_apresentado ?? it.valor_base);
    grupo.glosa += toNum(it.valor_glosa);
    grupo.liquido += toNum(it.valor_liquido);
    grupo.itens += 1;
    if (!grupo.motivoGlosa && it.motivo_glosa) grupo.motivoGlosa = it.motivo_glosa;
    if (!grupo.dataPagamento && it.data_pagamento) grupo.dataPagamento = it.data_pagamento;
  }

  return [...map.values()];
}

function classificar(
  apresentado: number,
  esperado: number | null,
  glosa: number,
  liquido: number,
  matched: boolean,
): ConciliacaoStatus {
  if (!matched) return "aberto";
  if (glosa > EPS) {
    return liquido <= EPS ? "glosado_total" : "pago_parcial";
  }
  if (liquido > EPS) return "pago_integral";
  // casou, mas nada recebido e sem glosa registrada
  const ref = apresentado > EPS ? apresentado : esperado ?? 0;
  return ref > EPS ? "aberto" : "pago_integral";
}

function encontrarGrupo(
  guideKeys: string[],
  nameKey: string,
  grupos: RepasseGrupo[],
): {
  grupo: RepasseGrupo | null;
  matchType: "guia" | "nome" | null;
} {
  // 1ª passada: casa por número de guia
  for (const g of grupos) {
    if (g.consumido) continue;
    if (guideKeys.some((k) => g.guides.has(k))) {
      return { grupo: g, matchType: "guia" };
    }
  }
  // 2ª passada: casa por nome normalizado
  if (nameKey) {
    for (const g of grupos) {
      if (g.consumido) continue;
      if (g.names.has(nameKey)) {
        return { grupo: g, matchType: "nome" };
      }
    }
  }
  return { grupo: null, matchType: null };
}

export interface ConciliacaoData {
  rows: ConciliacaoRow[];
  resumo: ConciliacaoResumo;
}

/** Modo de conciliação: contra guias de acompanhamento ou contra faturamentos. */
export type ConciliacaoModo = "atendimento" | "faturamento";

/**
 * Entidade "esperada" (lado esquerdo do encontro de contas), normalizada para
 * que o mesmo motor sirva tanto para guias de acompanhamento quanto para
 * faturamentos.
 */
interface EntidadeConciliacao {
  id: string;
  numeroGuia: string | null;
  guideKeys: string[];
  paciente: string | null;
  convenio: string | null;
  valorEsperado: number | null;
}

export interface FaturamentoRow {
  id: string;
  numero_guia_honorarios: string | null;
  numero_autorizacao: string | null;
  numero_guia_internacao: string | null;
  paciente_nome: string | null;
  paciente_convenio: string | null;
  valor_total_faturado: number | null;
}

export async function listarFaturamentos(): Promise<FaturamentoRow[]> {
  const { data, error } = await supabase
    .from("faturamentos")
    .select(
      "id, numero_guia_honorarios, numero_autorizacao, numero_guia_internacao, paciente_nome, paciente_convenio, valor_total_faturado",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FaturamentoRow[];
}

async function listarEntidadesAtendimento(): Promise<EntidadeConciliacao[]> {
  const guias = await listarGuiasAcompanhamento();
  return guias.map((g) => ({
    id: g.id,
    numeroGuia:
      g.numero_guia_prestador || g.numero_guia_sadt || g.numero_guia_operadora || null,
    guideKeys: [
      normNum(g.numero_guia_prestador),
      normNum(g.numero_guia_sadt),
      normNum(g.numero_guia_operadora),
    ].filter(Boolean),
    paciente: g.nome_beneficiario,
    convenio: null,
    valorEsperado: g.valor_total_geral != null ? toNum(g.valor_total_geral) : null,
  }));
}

async function listarEntidadesFaturamento(): Promise<EntidadeConciliacao[]> {
  const fats = await listarFaturamentos();
  return fats.map((f) => ({
    id: f.id,
    numeroGuia:
      f.numero_guia_honorarios || f.numero_autorizacao || f.numero_guia_internacao || null,
    guideKeys: [
      normNum(f.numero_guia_honorarios),
      normNum(f.numero_autorizacao),
      normNum(f.numero_guia_internacao),
    ].filter(Boolean),
    paciente: f.paciente_nome,
    convenio: f.paciente_convenio,
    valorEsperado: f.valor_total_faturado != null ? toNum(f.valor_total_faturado) : null,
  }));
}

export async function carregarConciliacao(
  modo: ConciliacaoModo = "atendimento",
): Promise<ConciliacaoData> {
  const [entidades, itensRepasse] = await Promise.all([
    modo === "faturamento"
      ? listarEntidadesFaturamento()
      : listarEntidadesAtendimento(),
    listarTodosItensRetorno(),
  ]);

  const grupos = agruparRepasse(itensRepasse);
  const rows: ConciliacaoRow[] = [];

  for (const ent of entidades) {
    const nameKey = normName(ent.paciente);
    const { grupo, matchType } = encontrarGrupo(ent.guideKeys, nameKey, grupos);
    if (grupo) grupo.consumido = true;

    const esperado = ent.valorEsperado;
    const apresentado = grupo ? grupo.apresentado : null;
    const glosa = grupo ? grupo.glosa : 0;
    const liquido = grupo ? grupo.liquido : 0;
    const matched = !!grupo;
    const status = classificar(apresentado ?? 0, esperado, glosa, liquido, matched);

    const ref = (apresentado && apresentado > EPS ? apresentado : esperado) ?? 0;
    const percentualRecebido = ref > EPS ? Math.min(1, liquido / ref) : matched ? 1 : 0;

    rows.push({
      key: `${modo}:${ent.id}`,
      guiaId: ent.id,
      repasseId: grupo?.repasseId ?? null,
      numeroGuia: ent.numeroGuia || grupo?.numeroGuia || null,
      paciente: ent.paciente || grupo?.paciente || null,
      convenio: ent.convenio ?? grupo?.convenio ?? null,
      competencia: grupo?.competencia ?? null,
      origemRepasse: grupo?.origem ?? null,
      dataPagamento: grupo?.dataPagamento ?? null,
      valorEsperado: esperado,
      valorApresentado: apresentado,
      valorGlosa: glosa,
      valorLiquido: liquido,
      motivoGlosa: grupo?.motivoGlosa ?? null,
      status,
      temGlosa: glosa > EPS,
      matched,
      matchType,
      semGuia: false,
      percentualRecebido,
      itens: grupo?.itens ?? 0,
    });
  }

  // Repasses que não casaram com nenhuma guia de acompanhamento
  for (const g of grupos) {
    if (g.consumido) continue;
    const status = classificar(g.apresentado, null, g.glosa, g.liquido, true);
    const ref = g.apresentado > EPS ? g.apresentado : g.liquido;
    rows.push({
      key: `repasse:${g.repasseId ?? ""}:${g.paciente ?? ""}:${g.numeroGuia ?? ""}`,
      guiaId: null,
      repasseId: g.repasseId,
      numeroGuia: g.numeroGuia,
      paciente: g.paciente,
      convenio: g.convenio,
      competencia: g.competencia,
      origemRepasse: g.origem,
      dataPagamento: g.dataPagamento,
      valorEsperado: null,
      valorApresentado: g.apresentado,
      valorGlosa: g.glosa,
      valorLiquido: g.liquido,
      motivoGlosa: g.motivoGlosa,
      status,
      temGlosa: g.glosa > EPS,
      matched: true,
      matchType: null,
      semGuia: true,
      percentualRecebido: ref > EPS ? Math.min(1, g.liquido / ref) : 1,
      itens: g.itens,
    });
  }

  const resumo = calcularResumo(rows);
  return { rows, resumo };
}

function calcularResumo(rows: ConciliacaoRow[]): ConciliacaoResumo {
  const guias = rows.filter((r) => !r.semGuia);
  const resumo: ConciliacaoResumo = {
    totalGuias: guias.length,
    totalConciliadas: 0,
    totalAbertas: 0,
    totalComGlosa: 0,
    totalPagoIntegral: 0,
    totalPagoParcial: 0,
    totalGlosadoTotal: 0,
    totalSemGuia: rows.filter((r) => r.semGuia).length,
    valorEsperado: 0,
    valorApresentado: 0,
    valorRecebido: 0,
    valorGlosa: 0,
    valorEmAberto: 0,
    taxaConciliacao: 0,
    taxaGlosa: 0,
  };

  for (const r of rows) {
    resumo.valorRecebido += r.valorLiquido;
    // Só soma glosa "real" (acima do limiar), para o valor e a contagem
    // nunca se contradizerem no painel.
    resumo.valorGlosa += r.temGlosa ? r.valorGlosa : 0;
    resumo.valorApresentado += r.valorApresentado ?? 0;
    if (r.temGlosa) resumo.totalComGlosa += 1;
    if (!r.semGuia) {
      resumo.valorEsperado += r.valorEsperado ?? 0;
      if (r.matched) resumo.totalConciliadas += 1;
      switch (r.status) {
        case "aberto":
          resumo.totalAbertas += 1;
          resumo.valorEmAberto += r.valorEsperado ?? 0;
          break;
        case "pago_integral":
          resumo.totalPagoIntegral += 1;
          break;
        case "pago_parcial":
          resumo.totalPagoParcial += 1;
          break;
        case "glosado_total":
          resumo.totalGlosadoTotal += 1;
          break;
      }
    }
  }

  resumo.taxaConciliacao =
    resumo.totalGuias > 0 ? resumo.totalConciliadas / resumo.totalGuias : 0;
  const baseGlosa = resumo.valorApresentado > EPS ? resumo.valorApresentado : resumo.valorRecebido + resumo.valorGlosa;
  resumo.taxaGlosa = baseGlosa > EPS ? resumo.valorGlosa / baseGlosa : 0;

  return resumo;
}

export const STATUS_META: Record<
  ConciliacaoStatus,
  { label: string; tone: string; dot: string; text: string; bg: string; chart: string }
> = {
  aberto: {
    label: "Em aberto",
    tone: "amber",
    dot: "bg-amber-400",
    text: "text-amber-700",
    bg: "bg-amber-50 ring-amber-200",
    chart: "#f59e0b",
  },
  pago_integral: {
    label: "Pago integral",
    tone: "emerald",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50 ring-emerald-200",
    chart: "#10b981",
  },
  pago_parcial: {
    label: "Pago parcial",
    tone: "sky",
    dot: "bg-sky-500",
    text: "text-sky-700",
    bg: "bg-sky-50 ring-sky-200",
    chart: "#0ea5e9",
  },
  glosado_total: {
    label: "Glosado total",
    tone: "rose",
    dot: "bg-rose-500",
    text: "text-rose-700",
    bg: "bg-rose-50 ring-rose-200",
    chart: "#f43f5e",
  },
};
