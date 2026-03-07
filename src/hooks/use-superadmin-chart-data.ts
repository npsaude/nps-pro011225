import { useEffect, useState } from "react";
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

const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function useSuperAdminChartData(enabled: boolean) {
  const [chartData, setChartData] = useState<MonthlyChartRow[]>([]);
  const [topDoctors, setTopDoctors] = useState<TopDoctorRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);

    const fetch = async () => {
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

      if (cancelled) return;
      if (error || !guias) {
        setLoading(false);
        return;
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
      const rows: MonthlyChartRow[] = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const idx = d.getMonth();
        rows.push({
          month: MONTH_LABELS[idx],
          enviadas: Math.round(monthMap.get(idx) ?? 0),
          pagas: 0,   // sem dados ainda
          glosa: 0,   // sem dados ainda
        });
      }
      setChartData(rows);

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

      let medicoNomes = new Map<string, string>();
      if (topIds.length > 0) {
        const { data: medRows } = await supabase
          .from("medicos")
          .select("id, nome")
          .in("id", topIds);
        for (const m of medRows ?? []) {
          medicoNomes.set(m.id, m.nome);
        }
      }

      if (cancelled) return;

      const top: TopDoctorRow[] = topIds.map((id, i) => {
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

      setTopDoctors(top);
      setLoading(false);
    };

    void fetch();
    return () => { cancelled = true; };
  }, [enabled]);

  return { chartData, topDoctors, loading };
}
