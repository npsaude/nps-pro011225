import React from "react";

interface RankingItem {
  nome: string;
  valor: number;
  formatted: string;
}

const data: RankingItem[] = [
  { nome: "Hosp. Albert Einstein", valor: 185_000, formatted: "R$ 185.000" },
  { nome: "Hosp. Sírio-Libanês", valor: 142_000, formatted: "R$ 142.000" },
  { nome: "Hosp. Santa Catarina", valor: 98_500, formatted: "R$ 98.500" },
  { nome: "Hosp. Moinhos de Vento", valor: 45_200, formatted: "R$ 45.200" },
  { nome: "Clínica Ortopédica SP", valor: 14_500, formatted: "R$ 14.500" },
];

const HospitalRankingChart: React.FC = () => {
  const maxValor = Math.max(...data.map((d) => d.valor));

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const widthPercent = (item.valor / maxValor) * 100;

        return (
          <div key={item.nome} className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-300">
              <span>{item.nome}</span>
              <span className="font-semibold text-emerald-300">
                {item.formatted}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HospitalRankingChart;