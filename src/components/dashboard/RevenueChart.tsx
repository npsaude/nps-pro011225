import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Line,
} from "recharts";

type Period = "mes" | "trimestre" | "ano";

interface RevenueChartProps {
  period: Period;
}

const baseData = [
  { name: "Jan", value: 32, line: 2 },
  { name: "Fev", value: 24, line: 1.5 },
  { name: "Mar", value: 48, line: 2.8 },
  { name: "Abr", value: 20, line: 1.2 },
  { name: "Mai", value: 55, line: 3.2 },
  { name: "Jun", value: 40, line: 2.0 },
  { name: "Jul", value: 72, line: 3.8 },
  { name: "Ago", value: 60, line: 3.0 },
  { name: "Set", value: 78, line: 4.0 },
  { name: "Out", value: 70, line: 3.1 },
  { name: "Nov", value: 69, line: 2.9 },
  { name: "Dez", value: 100, line: 4.5, highlight: true },
];

const monthData = baseData.slice(-3); // últimos 3 meses
const quarterData = baseData.slice(-6); // últimos 6 meses;

function getData(period: Period) {
  if (period === "mes") return monthData;
  if (period === "trimestre") return quarterData;
  return baseData;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ period }) => {
  const data = getData(period);

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            stroke="#1f2937"
            vertical={false}
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickFormatter={(value) => `k${value}`}
          />
          <Tooltip
            cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
            contentStyle={{
              backgroundColor: "#020617",
              borderRadius: 12,
              border: "1px solid #1e293b",
              padding: "8px 10px",
              fontSize: 12,
            }}
            labelStyle={{ color: "#e2e8f0" }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={(value: number, key: string) => {
              if (key === "value") return [`R$ ${value.toFixed(0)}k`, "Faturado"];
              if (key === "line") return [`R$ ${value.toFixed(1)}k`, "Glosa"];
              return [value, key];
            }}
          />
          <Bar dataKey="value" radius={[8, 8, 4, 4]}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.highlight ? "#10B981" : "#1f2937"}
              />
            ))}
          </Bar>
          {/* Linha vermelha representando a glosa mensal */}
          <Line
            type="monotone"
            dataKey="line"
            stroke="#EF4444"
            strokeWidth={2}
            dot={false}
            strokeLinecap="round"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;