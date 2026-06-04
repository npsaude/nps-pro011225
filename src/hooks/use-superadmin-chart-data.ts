import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MonthlyChartRow = {
  month: string;   // "Jan", "Fev", ...
  enviadas: number;
  pagas: number;
  glosa: number;
};

export type TopDoctorRow = {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  revenue: string;        // formatado "R$ 1.234,00"
  revenueRaw: number;
};

export type SuperAdminChartData = {
  chartData: MonthlyChartRow[];
  topDoctors: TopDoctorRow[];
};

const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const EMPTY_CHART_DATA: SuperAdminChartData = { chartData: [], topDoctors: [] };

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Busca e agrega os dados do gráfico mensal e do top de médicos. */
export async function fetchSuperAdminChartData(): Promise<SuperAdminChartData> {
  // Últimos 12 meses
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const sinceIso = since.toISOString();

  // Busca todas as guias dos últimos 12 meses com medico_id e profissional_nome
  const { data: guias, error } = await supabase
    .from("guia_solicitacao")
    .select("id, medico_id, profissional_nome, valor_total_honorarios, created_at")
    .gte("created_at", sinceIso)
    .not("valor_total_honorarios", "is", null);

  if (error || !guias) {
    return EMPTY_CHART_DATA;
  }

  // ── Gráfico mensal ────────────────────────────────────────────────────
  const monthMap = new Map<number, number>(); // month index (0-11) → soma
  for (const g of guias) {
    const d = new Date(g.created_at);
    const monthIdx = d.getMonth();
    const val = Number(g.valor_total_honorarios) || 0;
    monthMap.set(monthIdx, (monthMap.get(monthIdx) ?? 0) + val);
  }

  // Monta array dos últimos 12 meses em ordem
  const chartData: MonthlyChartRow[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const idx = d.getMonth();
    chartData.push({
      month: MONTH_LABELS[idx],
      enviadas: Math.round(monthMap.get(idx) ?? 0),
      pagas: 0,   // sem dados ainda
      glosa: 0,   // sem dados ainda
    });
  }

  // ── Top médicos ───────────────────────────────────────────────────────
  // Agrupa por medico_id somando valor_total_honorarios
  const doctorMap = new Map<string, { nome: string; total: number }>();
  for (const g of guias) {
    const key = g.medico_id as string;
    const val = Number(g.valor_total_honorarios) || 0;
    const nome = (g.profissional_nome as string | null) ?? "";
    const prev = doctorMap.get(key);
    if (prev) {
      prev.total += val;
      // Mantém o nome se ainda não temos
      if (!prev.nome && nome) prev.nome = nome;
    } else {
      doctorMap.set(key, { nome, total: val });
    }
  }

  // Busca nomes dos médicos na tabela medicos (para os top 5)
  const topIds = [...doctorMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([id]) => id);

  const medicoNomes = new Map<string, string>();
  if (topIds.length > 0) {
    const { data: medRows } = await supabase
      .from("medicos")
      .select("id, nome")
      .in("id", topIds);
    for (const m of medRows ?? []) {
      medicoNomes.set(m.id, m.nome);
    }
  }

  const topDoctors: TopDoctorRow[] = topIds.map((id) => {
    const entry = doctorMap.get(id)!;
    const nome = medicoNomes.get(id) || entry.nome || "Médico";
    return {
      id,
      name: nome,
      specialty: "",
      avatar: "",
      revenue: formatBRL(entry.total),
      revenueRaw: entry.total,
    };
  });

  return { chartData, topDoctors };
}

export function useSuperAdminChartData(enabled: boolean) {
  const { data, isFetching } = useQuery({
    queryKey: ["superadmin", "chart-data"],
    queryFn: fetchSuperAdminChartData,
    enabled,
    staleTime: 1000 * 60 * 5,
  });

  return {
    chartData: data?.chartData ?? EMPTY_CHART_DATA.chartData,
    topDoctors: data?.topDoctors ?? EMPTY_CHART_DATA.topDoctors,
    loading: isFetching,
  };
}
