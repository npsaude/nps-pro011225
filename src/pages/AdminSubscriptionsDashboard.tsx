import { useEffect, useMemo, useState } from "react";
import { BarChart3, DollarSign, UserCheck, UserX } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import MonthlyCumulativeSubscriptionsChart from "@/components/subscriptions/MonthlyCumulativeSubscriptionsChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSystemUser } from "@/hooks/use-system-user";

type MonthlyPoint = { date: string; month: string; cumulative: number };
type PiePoint = { name: string; value: number; color: string };
type CyclePoint = { name: string; value: number; color: string };

type PlanRow = {
  price_month: number | string | null;
  price_annual: number | string | null;
  billing_interval: string | null;
  code: string | null;
  name: string | null;
};

type EnrollmentRow = {
  id: string;
  user_email: string | null;
  status: string | null;
  cancelado: boolean | null;
  created_at: string | null;
  started_at: string | null;
  current_period_end: string | null;
  plan: PlanRow | PlanRow[] | null;
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

function lastMonthsKeys(count: number) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
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

function isActiveEnrollment(row: Pick<EnrollmentRow, "status" | "cancelado">) {
  const status = String(row.status ?? "").trim().toUpperCase();
  return ["ACTIVE", "TRIAL", "PENDING", "ATIVO"].includes(status) && row.cancelado !== true;
}

function isCanceledEnrollment(row: Pick<EnrollmentRow, "status" | "cancelado">) {
  const status = String(row.status ?? "").trim().toUpperCase();
  return row.cancelado === true || ["CANCELED", "CANCELADO", "CANCELADA"].includes(status);
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

function renderPieValueLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  value?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, value } = props;
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

function normalizeEmail(email: string | null) {
  return String(email ?? "").trim().toLowerCase();
}

function enrollmentSortScore(row: EnrollmentRow) {
  const currentPeriodEndMs = row.current_period_end
    ? new Date(row.current_period_end).getTime()
    : Number.NEGATIVE_INFINITY;

  if (Number.isFinite(currentPeriodEndMs)) {
    return currentPeriodEndMs;
  }

  const startedAtMs = row.started_at ? new Date(row.started_at).getTime() : Number.NEGATIVE_INFINITY;
  if (Number.isFinite(startedAtMs)) {
    return startedAtMs;
  }

  const createdAtMs = row.created_at ? new Date(row.created_at).getTime() : Number.NEGATIVE_INFINITY;
  return Number.isFinite(createdAtMs) ? createdAtMs : Number.NEGATIVE_INFINITY;
}

function pickLatestEnrollmentPerUser(rows: EnrollmentRow[]) {
  const byEmail = new Map<string, EnrollmentRow>();

  for (const row of rows) {
    const email = normalizeEmail(row.user_email);
    if (!email) continue;

    const current = byEmail.get(email);
    if (!current || enrollmentSortScore(row) > enrollmentSortScore(current)) {
      byEmail.set(email, row);
    }
  }

  return Array.from(byEmail.values());
}

export default function AdminSubscriptionsDashboard() {
  const { loading: userLoading, systemUser, error: userError } = useSystemUser();
  const blocked =
    !userLoading &&
    (!systemUser ||
      String(systemUser.regra ?? "").trim().toUpperCase() !== "SUPER_ADMIN");

  const monthsKeys = useMemo(() => lastMonthsKeys(12), []);

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
        .select(`
          id,
          user_email,
          status,
          cancelado,
          created_at,
          started_at,
          current_period_end,
          plan:plan_id (
            price_month,
            price_annual,
            billing_interval,
            code,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        showError(error.message);
        setLoading(false);
        return;
      }

      const allRows = ((data ?? []) as EnrollmentRow[]).filter((row) => normalizeEmail(row.user_email));
      const latestRows = pickLatestEnrollmentPerUser(allRows);
      const activeRows = latestRows.filter(isActiveEnrollment);
      const canceledRows = latestRows.filter(isCanceledEnrollment);

      setActiveUsers(activeRows.length);
      setCancelations(canceledRows.length);

      // Receita: soma do valor do plano nas assinaturas ativas
      const revenue = activeRows.reduce((acc, row) => {
        const plan = pickPlan(row.plan);
        return acc + (plan ? getPlanAmount(plan) : 0);
      }, 0);
      setRevenueAmount(revenue);

      const monthSet = new Set(monthsKeys);
      const countByMonth = new Map<string, number>();

      activeRows.forEach((row) => {
        const raw = row.started_at ?? row.created_at;
        if (!raw) return;
        const d = new Date(raw);
        if (!Number.isFinite(d.getTime())) return;
        const key = monthKey(new Date(d.getFullYear(), d.getMonth(), 1));
        if (!monthSet.has(key)) return;
        countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1);
      });

      let cumulative = 0;
      const nextBarData: MonthlyPoint[] = monthsKeys.map((k) => {
        cumulative += countByMonth.get(k) ?? 0;
        return {
          date: `${k}-01`,
          month: monthLabel(k),
          cumulative,
        };
      });
      setBarData(nextBarData);

      const byPlan = new Map<string, number>();
      activeRows.forEach((row) => {
        const plan = pickPlan(row.plan);
        const key = bucketPlan(plan?.code ?? plan?.name ?? "");
        byPlan.set(key, (byPlan.get(key) ?? 0) + 1);
      });

      const ordered: Array<keyof typeof PIE_COLORS> = [
        "Básico",
        "Intermediário",
        "Avançado",
        "Outros",
      ];

      const nextPieData: PiePoint[] = ordered
        .map((name) => ({
          name,
          value: byPlan.get(name) ?? 0,
          color: PIE_COLORS[name],
        }))
        .filter((item) => item.value > 0);

      setPieData(nextPieData);

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
                Baseado na última assinatura de cada usuário nos últimos 12 meses
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
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-gradient-to-b from-[#0d1b2e] to-[#091422] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Assinantes ativos</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/90 text-white">
                        <UserCheck className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-4 text-center text-3xl font-bold text-white">{loading ? "—" : activeUsers}</p>
                    <p className="mt-4 text-[11px] leading-4 text-slate-400">
                      Última assinatura por e-mail com status <span className="text-slate-200">ACTIVE</span> / <span className="text-slate-200">TRIAL</span> não canceladas
                    </p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-gradient-to-b from-[#0d1b2e] to-[#091422] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Receita recorrente</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/90 text-white">
                        <DollarSign className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-4 text-center text-3xl font-bold text-white">{loading ? "—" : formatBRL(revenueAmount)}</p>
                    <p className="mt-4 text-[11px] leading-4 text-slate-400">
                      Soma dos planos ativos por ciclo mensal ou anual
                    </p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-gradient-to-b from-[#0d1b2e] to-[#091422] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Cancelamentos</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-500/90 text-white">
                        <UserX className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-4 text-center text-3xl font-bold text-white">{loading ? "—" : cancelations}</p>
                    <p className="mt-4 text-[11px] leading-4 text-slate-400">
                      Status <span className="text-slate-200">CANCELED</span> ou <span className="text-slate-200">cancelado = true</span>
                    </p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-gradient-to-b from-[#0d1b2e] to-[#091422] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Mensal x anual</p>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/90 text-white">
                        <BarChart3 className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Mensal</p>
                        <p className="mt-1 text-2xl font-bold text-white">
                          {loading ? "—" : (cycleData.find((i) => i.name === "Mensal")?.value ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Anual</p>
                        <p className="mt-1 text-2xl font-bold text-white">
                          {loading ? "—" : (cycleData.find((i) => i.name === "Anual")?.value ?? 0)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] leading-4 text-slate-400">
                      Distribuição das assinaturas ativas por ciclo
                    </p>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-5">
                  <MonthlyCumulativeSubscriptionsChart data={barData} loading={loading} />

                  <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95 lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Assinaturas por plano
                      </CardTitle>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Distribuição da base ativa por categoria de plano
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
