import { useEffect, useMemo, useState } from "react";
import { BarChart3, DollarSign, UserCheck, UserX } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSystemUser } from "@/hooks/use-system-user";

type MonthlyPoint = { month: string; cumulative: number };
type PiePoint = { name: string; value: number; color: string };
type CyclePoint = { name: string; value: number; color: string };

type EnrollmentRow = {
  status: string | null;
  created_at: string | null;
  started_at: string | null;
  plan:
    | {
        price_month: number | string | null;
        price_annual: number | string | null;
        billing_interval: string | null;
        code: string | null;
        name: string | null;
      }
    | {
        price_month: number | string | null;
        price_annual: number | string | null;
        billing_interval: string | null;
        code: string | null;
        name: string | null;
      }[]
    | null;
};

const PIE_COLORS: Record<string, string> = {
  Básico: "#2ECC71",
  Intermediário: "#4A90E2",
  Avançado: "#D4A017",
  Outros: "#8A8A8A",
};

const CYCLE_COLORS: Record<"Mensal" | "Anual", string> = {
  Mensal: "#6366F1",
  Anual: "#F59E0B",
};

function monthKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1)
    .toLocaleString("pt-BR", { month: "short" })
    .replace(".", "");
}

function nextMonthsKeys(count: number) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date(first.getFullYear(), first.getMonth() + i, 1);
    return monthKey(d);
  });
}

function formatBRL(value: number) {
  return (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function norm(text: unknown) {
  return String(text ?? "").trim().toLowerCase();
}

function isActiveStatus(status: unknown) {
  const s = norm(status);
  return s === "active" || s === "ativo";
}

function isCanceledStatus(status: unknown) {
  const s = norm(status);
  return s === "canceled" || s === "cancelado" || s === "cancelada";
}

function pickPlan(plan: EnrollmentRow["plan"]) {
  if (!plan) return null;
  if (Array.isArray(plan)) return plan[0] ?? null;
  return plan;
}

function bucketPlan(planCodeOrName: string) {
  const t = norm(planCodeOrName);
  if (t.includes("basic") || t.includes("basico")) return "Básico";
  if (t.includes("inter")) return "Intermediário";
  if (t.includes("avan") || t.includes("advanced")) return "Avançado";
  return "Outros";
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPlanAmount(plan: NonNullable<ReturnType<typeof pickPlan>>) {
  const interval = norm(plan.billing_interval);
  if (interval === "year") {
    return toNumber(plan.price_annual);
  }
  return toNumber(plan.price_month);
}

function getPlanCycleLabel(plan: ReturnType<typeof pickPlan>) {
  return norm(plan?.billing_interval) === "year" ? "Anual" : "Mensal";
}

function renderPieValueLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
  if (!value || value <= 0) return null;

  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.62;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="hsl(var(--background))"
      textAnchor="middle"
      dominantBaseline="central"
      className="select-none text-[11px] font-semibold"
    >
      {value}
    </text>
  );
}

export default function AdminSubscriptionsDashboard() {
  const { loading: userLoading, systemUser, error: userError } = useSystemUser();
  const blocked =
    !userLoading &&
    (!systemUser ||
      String(systemUser.regra ?? "").trim().toUpperCase() !== "SUPER_ADMIN");

  const monthsKeys = useMemo(() => nextMonthsKeys(12), []);

  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState(0);
  const [revenueAmount, setRevenueAmount] = useState(0);
  const [cancelations, setCancelations] = useState(0);
  const [barData, setBarData] = useState<MonthlyPoint[]>([]);
  const [pieData, setPieData] = useState<PiePoint[]>([]);
  const [cycleData, setCycleData] = useState<CyclePoint[]>([]);

  useEffect(() => {
    if (blocked) return;

    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("subscription_enrollments")
        .select(
          "status,cancelado,created_at,started_at,plan:plan_id(price_month,price_annual,billing_interval,code,name)",
        );

      if (error) {
        showError(error.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as (EnrollmentRow & { cancelado?: boolean | null })[];

      const activeRows = rows.filter((r) => isActiveStatus(r.status) && !r.cancelado);
      const canceledRows = rows.filter((r) => isCanceledStatus(r.status) || r.cancelado);

      setActiveUsers(activeRows.length);
      setCancelations(canceledRows.length);

      // Receita: soma do valor do plano nas assinaturas ativas
      const revenue = activeRows.reduce((acc, r) => {
        const plan = pickPlan(r.plan);
        return acc + (plan ? getPlanAmount(plan) : 0);
      }, 0);
      setRevenueAmount(revenue);

      // Gráfico de barras (cumulativo) — mês corrente + próximos 11 meses
      const monthSet = new Set(monthsKeys);
      const countByMonth = new Map<string, number>();

      activeRows.forEach((r) => {
        const raw = r.started_at ?? r.created_at;
        if (!raw) return;
        const d = new Date(raw);
        const key = monthKey(new Date(d.getFullYear(), d.getMonth(), 1));
        if (!monthSet.has(key)) return;
        countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
      });

      let cumulative = 0;
      const bar: MonthlyPoint[] = monthsKeys.map((k) => {
        cumulative += countByMonth.get(k) ?? 0;
        return { month: monthLabel(k), cumulative };
      });
      setBarData(bar);

      // Pizza: assinaturas ativas por plano (básico/intermediário/avançado)
      const byPlan = new Map<string, number>();
      activeRows.forEach((r) => {
        const p = pickPlan(r.plan);
        const key = bucketPlan(p?.code ?? p?.name ?? "");
        byPlan.set(key, (byPlan.get(key) ?? 0) + 1);
      });

      const ordered: Array<keyof typeof PIE_COLORS> = [
        "Básico",
        "Intermediário",
        "Avançado",
        "Outros",
      ];

      const pie: PiePoint[] = ordered
        .map((name) => ({
          name,
          value: byPlan.get(name) ?? 0,
          color: PIE_COLORS[name],
        }))
        .filter((p) => p.value > 0);

      setPieData(pie);

      const byCycle = new Map<string, number>();
      activeRows.forEach((r) => {
        const cycle = getPlanCycleLabel(pickPlan(r.plan));
        byCycle.set(cycle, (byCycle.get(cycle) ?? 0) + 1);
      });

      const cycle: CyclePoint[] = ["Mensal", "Anual"]
        .map((name) => ({
          name,
          value: byCycle.get(name) ?? 0,
          color: CYCLE_COLORS[name as keyof typeof CYCLE_COLORS],
        }))
        .filter((item) => item.value > 0);

      setCycleData(cycle);

      setLoading(false);
    };

    void load();
  }, [blocked, monthsKeys]);

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="assinaturas" assinaturasSubsection="dashboard" />

        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-white/90 p-4 lg:p-6 lg:shadow-[0_18px_60px_rgba(15,23,42,0.12)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-3">
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">
                Dashboard de Assinaturas
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Visão geral • próximos 12 meses (mês atual + 11)
              </p>
            </div>

            <div className="flex items-center self-start sm:self-auto">
              <AdminHeaderActions />
            </div>
          </header>

          <main className="flex-1 space-y-4">
            {userError ? (
              <Card className="rounded-3xl border border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                <CardContent className="p-4 text-sm">
                  Erro ao validar permissões: {userError.message}
                </CardContent>
              </Card>
            ) : blocked ? (
              <Card className="rounded-3xl border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
                <CardContent className="p-4 text-sm text-slate-600 dark:text-slate-300">
                  Acesso restrito: esta área é exclusiva para super_admin.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Métricas */}
                <section className="grid gap-4 lg:grid-cols-4">
                  <Card className="overflow-hidden rounded-[22px] border border-slate-800 bg-[linear-gradient(180deg,#0B1B33_0%,#051427_100%)] shadow-[0_18px_40px_rgba(2,6,23,0.28)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-start justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200/90">
                        <span className="max-w-[180px] leading-5">Assinantes ativos</span>
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-[0_10px_24px_rgba(14,165,233,0.35)]">
                          <UserCheck className="h-5 w-5" />
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-[168px] flex-col justify-between pb-5">
                      <div className="text-4xl font-semibold tracking-tight text-white">
                        {loading ? "—" : activeUsers}
                      </div>
                      <div className="space-y-2">
                        <p className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                          <span>↗</span>
                          Assinaturas ativas / em trial
                        </p>
                        <p className="text-[11px] text-slate-400/80">
                          Considera <span className="font-medium text-slate-300">ACTIVE</span> e <span className="font-medium text-slate-300">TRIAL</span> com <span className="font-medium text-slate-300">cancelado = false</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden rounded-[22px] border border-slate-800 bg-[linear-gradient(180deg,#0B1B33_0%,#051427_100%)] shadow-[0_18px_40px_rgba(2,6,23,0.28)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-start justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200/90">
                        <span className="max-w-[180px] leading-5">Receita recorrente atual</span>
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-[0_10px_24px_rgba(139,92,246,0.35)]">
                          <DollarSign className="h-5 w-5" />
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-[168px] flex-col justify-between pb-5">
                      <div className="text-4xl font-semibold tracking-tight text-white">
                        {loading ? "—" : formatBRL(revenueAmount)}
                      </div>
                      <div className="space-y-2">
                        <p className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                          <span>↗</span>
                          Soma dos planos com assinatura ativa
                        </p>
                        <p className="text-[11px] text-slate-400/80">
                          Valor atual das assinaturas ativas por ciclo mensal ou anual
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden rounded-[22px] border border-slate-800 bg-[linear-gradient(180deg,#0B1B33_0%,#051427_100%)] shadow-[0_18px_40px_rgba(2,6,23,0.28)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-start justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200/90">
                        <span className="max-w-[180px] leading-5">Assinaturas canceladas</span>
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-500 text-white shadow-[0_10px_24px_rgba(100,116,139,0.35)]">
                          <UserX className="h-5 w-5" />
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-[168px] flex-col justify-between pb-5">
                      <div className="text-4xl font-semibold tracking-tight text-white">
                        {loading ? "—" : cancelations}
                      </div>
                      <div className="space-y-2">
                        <p className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                          <span>↗</span>
                          Total de assinaturas canceladas
                        </p>
                        <p className="text-[11px] text-slate-400/80">
                          Considera <span className="font-medium text-slate-300">status = CANCELED</span> ou <span className="font-medium text-slate-300">cancelado = true</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden rounded-[22px] border border-slate-800 bg-[linear-gradient(180deg,#0B1B33_0%,#051427_100%)] shadow-[0_18px_40px_rgba(2,6,23,0.28)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-start justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200/90">
                        <span className="max-w-[180px] leading-5">Mensal x anual</span>
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-[0_10px_24px_rgba(245,158,11,0.35)]">
                          <BarChart3 className="h-5 w-5" />
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex min-h-[168px] flex-col justify-between pb-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400/90">Mensal</p>
                          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                            {loading ? "—" : (cycleData.find((item) => item.name === "Mensal")?.value ?? 0)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400/90">Anual</p>
                          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                            {loading ? "—" : (cycleData.find((item) => item.name === "Anual")?.value ?? 0)}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                          <span>↗</span>
                          Distribuição das assinaturas ativas por ciclo
                        </p>
                        <p className="text-[11px] text-slate-400/80">
                          Comparativo entre planos <span className="font-medium text-slate-300">mensais</span> e <span className="font-medium text-slate-300">anuais</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                {/* Gráficos */}
                <section className="grid gap-4 lg:grid-cols-5">
                  <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95 lg:col-span-3">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                          <BarChart3 className="h-4 w-4" />
                        </span>
                        Assinaturas mensais (cumulativo)
                      </CardTitle>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Mês atual + próximos 11 meses
                      </p>
                    </CardHeader>

                    <CardContent className="h-72 px-2 pb-6 pt-2 sm:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E2E8F0"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "#64748B" }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#64748B" }}
                          />
                          <RechartsTooltip />
                          <Bar dataKey="cumulative" radius={[8, 8, 0, 0]} fill="#6366F1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95 lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Assinaturas por plano
                      </CardTitle>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Quantidade de assinaturas ativas por categoria
                      </p>
                    </CardHeader>

                    <CardContent className="h-72 px-2 pb-6 pt-2 sm:h-80">
                      {pieData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                          Nenhuma assinatura ativa para exibir.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={58}
                              outerRadius={92}
                              paddingAngle={2}
                              labelLine={false}
                              label={renderPieValueLabel}
                            >
                              {pieData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}