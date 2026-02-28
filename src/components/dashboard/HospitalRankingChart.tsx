import React, { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type Period = "mes" | "trimestre" | "ano";

interface RankingItem {
  nome: string;
  valor: number;
  formatted: string;
}

type FaturamentoRow = {
  hospital_nome: string | null;
  created_at: string;
  valor_total_faturado: string | number;
};

type GuiaRow = {
  executante_nome: string | null;
  contratado_nome: string | null;
  created_at: string;
  valor_total_faturamento: string | number | null;
};

function formatCurrencyNoCents(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

function buildRangeStart(period: Period): Date {
  const count = period === "mes" ? 3 : period === "trimestre" ? 6 : 12;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
}

export default function HospitalRankingChart({
  period = "ano",
  limit = 5,
}: {
  period?: Period;
  limit?: number;
}) {
  const [items, setItems] = useState<RankingItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const start = buildRangeStart(period);

      const [fatRes, guiaRes] = await Promise.all([
        supabase
          .from("faturamentos")
          .select("hospital_nome,created_at,valor_total_faturado")
          .gte("created_at", start.toISOString()),
        supabase
          .from("guia_solicitacao")
          .select(
            "executante_nome,contratado_nome,created_at,valor_total_faturamento",
          )
          .gte("created_at", start.toISOString()),
      ]);

      if (cancelled) return;

      const totals = new Map<string, number>();

      if (!fatRes.error) {
        const rows = (fatRes.data ?? []) as FaturamentoRow[];
        for (const r of rows) {
          const nome = r.hospital_nome?.trim() || "Instituição não informada";
          const v = toNumber(r.valor_total_faturado);
          if (v <= 0) continue;
          totals.set(nome, (totals.get(nome) ?? 0) + v);
        }
      }

      if (!guiaRes.error) {
        const rows = (guiaRes.data ?? []) as GuiaRow[];
        for (const r of rows) {
          const nome =
            r.executante_nome?.trim() ||
            r.contratado_nome?.trim() ||
            "Instituição não informada";
          const v = toNumber(r.valor_total_faturamento);
          if (v <= 0) continue;
          totals.set(nome, (totals.get(nome) ?? 0) + v);
        }
      }

      const ranked = Array.from(totals.entries())
        .map(([nome, valor]) => ({
          nome,
          valor,
          formatted: formatCurrencyNoCents(valor),
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, limit);

      setItems(ranked);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [limit, period]);

  const maxValor = useMemo(() => {
    return Math.max(1, ...items.map((d) => d.valor));
  }, [items]);

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="text-[12px] text-[#F5F5F5]/70">Sem dados para exibir.</div>
      ) : (
        items.map((item) => {
          const widthPercent = (item.valor / maxValor) * 100;

          return (
            <div key={item.nome} className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-[#F5F5F5]">
                <span className="truncate pr-3">{item.nome}</span>
                <span className="shrink-0 font-semibold text-[#F5F5F5]">
                  {item.formatted}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-black/40 border border-[#D4A017]/10">
                <div
                  className="h-2.5 rounded-full bg-[#D4A017] shadow-[0_0_14px_rgba(212,160,23,0.25)]"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}