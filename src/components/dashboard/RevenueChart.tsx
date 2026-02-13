import React from "react";
import {
  ComposedChart,
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
  { name: "Jan", value: 32, line: 6 },
  { name: "Fev", value: 24, line: 4 },
  { name: "Mar", value: 48, line: 8 },
  { name: "Abr", value: 20, line: 3 },
  { name: "Mai", value: 55, line: 9 },
  { name: "Jun", value: 40, line: 7 },
  { name: "Jul", value: 72, line: 12 },
  { name: "Ago", value: 60, line: 10 },
  { name: "Set", value: 78, line: 11 },
  { name: "Out", value: 70, line: 9 },
  { name: "Nov", value: 69, line: 8 },
  { name: "Dez", value: 100, line: 14, highlight: true },
];

const monthData = baseData.slice(-3); // últimos 3 meses
const quarterData = baseData.slice(-6); // últimos 6 meses

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
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            stroke="#262626"
            vertical={false}
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#6B7280", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#6B7280", fontSize: 11 }}
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
            formatter={(value: number, key: string) => {
              if (key === "value") return [`R$ ${value.toFixed(0)}k`, "Faturado"];
              if (key === "line") return [`R$ ${value.toFixed(0)}k`, "Glosa"];
              return [value, key];
            }}
          />
          <Bar dataKey="value" radius={[8, 8, 4, 4]}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.highlight ? "#D4A017" : "rgba(245,245,245,0.10)"}
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
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;