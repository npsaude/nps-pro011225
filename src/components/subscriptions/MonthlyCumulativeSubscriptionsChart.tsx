import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type MonthlyCumulativePoint = {
  date: string;
  month: string;
  cumulative: number;
};

type MonthlyCumulativeSubscriptionsChartProps = {
  data: MonthlyCumulativePoint[];
  loading?: boolean;
};

const chartConfig = {
  cumulative: {
    label: "Assinaturas",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const rangeOptions = [
  { value: "12m", label: "12 meses", size: 12 },
  { value: "6m", label: "6 meses", size: 6 },
  { value: "3m", label: "3 meses", size: 3 },
] as const;

function getRangeDescription(range: (typeof rangeOptions)[number]["value"]) {
  if (range === "3m") return "Mês atual + próximos 2 meses";
  if (range === "6m") return "Mês atual + próximos 5 meses";
  return "Mês atual + próximos 11 meses";
}

function formatMonthLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", {
    month: "short",
  }).replace(".", "");
}

function formatMonthTooltip(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export default function MonthlyCumulativeSubscriptionsChart({
  data,
  loading = false,
}: MonthlyCumulativeSubscriptionsChartProps) {
  const isMobile = useIsMobile();
  const [range, setRange] = React.useState<(typeof rangeOptions)[number]["value"]>("12m");
  const gradientId = React.useId().replace(/:/g, "");

  React.useEffect(() => {
    if (isMobile && range === "12m") {
      setRange("6m");
    }
  }, [isMobile, range]);

  const filteredData = React.useMemo(() => {
    const selectedRange = rangeOptions.find((option) => option.value === range);
    return data.slice(0, selectedRange?.size ?? data.length);
  }, [data, range]);

  return (
    <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95 lg:col-span-3">
      <CardHeader className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#D4A017]/12 text-[#B7860D] dark:bg-[#D4A017]/20 dark:text-[#FEE67A]">
              <BarChart3 className="h-4 w-4" />
            </span>
            Assinaturas mensais (cumulativo)
          </CardTitle>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {getRangeDescription(range)}
          </p>
        </div>

        <ToggleGroup
          type="single"
          value={range}
          onValueChange={(value) => {
            if (value === "12m" || value === "6m" || value === "3m") {
              setRange(value);
            }
          }}
          className="w-full justify-start rounded-xl border border-[#E2E8F0] bg-slate-50 p-1 sm:w-auto sm:justify-center"
        >
          {rangeOptions.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              size="sm"
              className="rounded-lg px-3 text-xs font-medium text-slate-500 hover:bg-white hover:text-slate-800 data-[state=on]:bg-[#D4A017]/12 data-[state=on]:text-[#8A6612] data-[state=on]:shadow-none dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100 dark:data-[state=on]:bg-[#D4A017]/20 dark:data-[state=on]:text-[#FEE67A]"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>

      <CardContent className="h-72 px-2 pb-6 pt-2 sm:h-80">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Carregando gráfico...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Nenhuma assinatura para exibir.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
            <AreaChart
              accessibilityLayer
              data={filteredData}
              margin={{ left: 8, right: 12, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-cumulative)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-cumulative)" stopOpacity={0.04} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-slate-200/80" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={24}
                tickFormatter={formatMonthLabel}
                tick={{ fontSize: 12, fill: "#64748B" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={30}
                tick={{ fontSize: 12, fill: "#64748B" }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" labelFormatter={formatMonthTooltip} />}
              />
              <Area
                type="natural"
                dataKey="cumulative"
                fill={`url(#${gradientId})`}
                stroke="var(--color-cumulative)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "var(--color-cumulative)",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
