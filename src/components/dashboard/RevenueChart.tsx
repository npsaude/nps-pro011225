import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";

type Period = "mes" | "trimestre" | "ano";

interface RevenueChartProps {
  period: Period;
}

type GuiaRow = {
  data_inicio_faturamento: string | null;
  data_emissao: string | null;
  created_at: string;
  valor_total_honorarios: string | number | null;
};

type FatRow = {
  created_at: string;
  data_atendimento: string | null;
  data_cirurgia: string | null;
  valor_total_faturado: string | number;
};

type Point = {
  name: string;
  value: number; // em milhares (k)
};

const PT_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toDateOrNull(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildMonthRange(period: Period) {
  const count = period === "mes" ? 3 : period === "trimestre" ? 6 : 12;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);

  const months: { key: string; label: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    months.push({
      key: monthKey(d),
      label: PT_MONTHS[d.getMonth()],
    });
  }

  return { start, months };
}

const RevenueChart: React.FC<RevenueChartProps> = ({ period }) => {
  const [guiaRows, setGuiaRows] = useState<GuiaRow[]>([]);
  const [fatRows, setFatRows] = useState<FatRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { start } = buildMonthRange(period);
      const startIso = start.toISOString();
      const startDate = startIso.slice(0, 10);

      const [guiaRes, fatRes] = await Promise.all([
        supabase
          .from("guia_solicitacao")
          .select("data_inicio_faturamento,data_emissao,created_at,valor_total_honorarios")
          .or(
            `data_inicio_faturamento.gte.${startDate},data_emissao.gte.${startDate},created_at.gte.${startIso}`,
          ),
        supabase
          .from("faturamentos")
          .select("created_at,data_atendimento,data_cirurgia,valor_total_faturado")
          .or(
            `data_atendimento.gte.${startDate},data_cirurgia.gte.${startDate},created_at.gte.${startIso}`,
          ),
      ]);

      if (cancelled) return;

      if (guiaRes.error) {
        console.error("[RevenueChart] Erro ao buscar guia_solicitacao:", guiaRes.error);
        setGuiaRows([]);
      } else {
        setGuiaRows((guiaRes.data ?? []) as GuiaRow[]);
      }

      if (fatRes.error) {
        console.error("[RevenueChart] Erro ao buscar faturamentos:", fatRes.error);
        setFatRows([]);
      } else {
        setFatRows((fatRes.data ?? []) as FatRow[]);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [period]);

  const data = useMemo<Point[]>(() => {
    const { months } = buildMonthRange(period);

    const totals = new Map<string, number>();

    for (const r of guiaRows) {
      const d =
        toDateOrNull(r.data_inicio_faturamento) ??
        toDateOrNull(r.data_emissao) ??
        toDateOrNull(r.created_at);
      if (!d) continue;

      const value = toNumber(r.valor_total_honorarios);
      if (value <= 0) continue;

      const key = monthKey(d);
      totals.set(key, (totals.get(key) ?? 0) + value);
    }

    for (const r of fatRows) {
      const d =
        toDateOrNull(r.data_atendimento) ??
        toDateOrNull(r.data_cirurgia) ??
        toDateOrNull(r.created_at);
      if (!d) continue;

      const value = toNumber(r.valor_total_faturado);
      if (value <= 0) continue;

      const key = monthKey(d);
      totals.set(key, (totals.get(key) ?? 0) + value);
    }

    return months.map((m) => {
      const sum = totals.get(m.key) ?? 0;
      return {
        name: m.label,
        value: Math.round(sum / 1000),
      };
    });
  }, [period, guiaRows, fatRows]);

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="rgba(245,245,245,0.08)" vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#F5F5F5", fontSize: 11 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#F5F5F5", fontSize: 11 }}
            tickFormatter={(value) => `k${value}`}
          />
          <Tooltip
            cursor={{ fill: "rgba(212, 160, 23, 0.10)" }}
            contentStyle={{
              backgroundColor: "#0b0b0b",
              borderRadius: 12,
              border: "1px solid rgba(212,160,23,0.20)",
              padding: "8px 10px",
              fontSize: 12,
            }}
            labelStyle={{ color: "#F5F5F5" }}
            itemStyle={{ color: "#F5F5F5" }}
            formatter={(value: number) => {
              const brl = Number(value) * 1000;
              return [formatCurrency(brl), "Faturado"];
            }}
          />
          <Bar dataKey="value" radius={[8, 8, 4, 4]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill="#D4A017" />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;