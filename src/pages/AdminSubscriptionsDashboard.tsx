import { useEffect, useMemo, useState } from "react";
import { BarChart3, Bell, DollarSign, UserCheck, UserX } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  BarChart,
} from "recharts";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSystemUser } from "@/hooks/use-system-user";

type MonthlyPoint = { month: string; cumulative: number };

function formatBRLFromCents(cents: number) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabelFromKey(key: string) {
  const [y, m] = key.split("-").map((v) => Number(v));
  const dt = new Date(y, (m ?? 1) - 1, 1);
  return dt.toLocaleString("pt-BR", { month: "short" }).replace(".", "");
}

function buildLastMonthsKeys(total: number) {
  const keys: string[] = [];
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 1);

  for (let i = total - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    keys.push(monthKey(dt));
  }
  return keys;
}

export default function AdminSubscriptionsDashboard() {
  const { loading: userLoading, systemUser, error: userError } = useSystemUser();
  const blocked =
    !userLoading && (!systemUser || systemUser.regra !== "SUPER_ADMIN");

  const [loading, setLoading] = useState(true);

  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [totalRevenueCents, setTotalRevenueCents] = useState<number>(0);
  const [cancellations, setCancellations] = useState<number>(0);
  const [chartData, setChartData] = useState<MonthlyPoint[]>([]);

  const monthsKeys = useMemo(() => buildLastMonthsKeys(12), []);

  useEffect(() => {
    if (blocked) return;

    const load = async () => {
      setLoading(true);

      try {
        const { count: usersCount, error: usersError } = await supabase
          .from("usuarios_sistema")
          .select("id_user", { count: "exact", head: true })
          .eq("ativo", true);

        if (usersError) throw usersError;
        setActiveUsers(usersCount ?? 0);

        const { data: enrollments, error: enrollmentsError } = await supabase
          .from("subscription_enrollments")
          .select(
            "id,status,created_at,started_at,plan:subscription_plans(price_cents)",
          );

        if (enrollmentsError) throw enrollmentsError;

        type Row = {
          id: string;
          status: string;
          created_at: string | null;
          started_at: string | null;
          plan: { price_cents: number }[] | { price_cents: number } | null;
        };

        const rows = (enrollments ?? []) as unknown as Row[];

        const planPriceCents = (plan: Row["plan"]) => {
          if (!plan) return 0;
          if (Array.isArray(plan)) return plan[0]?.price_cents ?? 0;
          return plan.price_cents ?? 0;
        };

        const activeSum = rows
          .filter((r) => r.status === "ACTIVE")
          .reduce((acc, r) => acc + planPriceCents(r.plan), 0);

        setTotalRevenueCents(activeSum);

        setCancellations(rows.filter((r) => r.status === "CANCELED").length);

        const countsByMonth = new Map<string, number>();
        rows
          .filter((r) => r.status === "ACTIVE")
          .forEach((r) => {
            const raw = r.started_at ?? r.created_at;
            if (!raw) return;
            const dt = new Date(raw);
            const key = monthKey(new Date(dt.getFullYear(), dt.getMonth(), 1));
            countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1);
          });

        let cumulative = 0;
        const points: MonthlyPoint[] = monthsKeys.map((key) => {
          cumulative += countsByMonth.get(key) ?? 0;
          return { month: monthLabelFromKey(key), cumulative };
        });

        setChartData(points);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Não foi possível carregar o dashboard de assinaturas.";
        showError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [blocked, monthsKeys]);

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="assinaturas" assinaturasSubsection="dashboard" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.12)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                  <BarChart3 className="h-4 w-4" />
                </span>
                <span>Dashboard de Assinaturas</span>
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Indicadores consolidados do motor de pagamentos (Asaas).
              </p>
            </div>

            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm ring-1 ring-slate-200/70 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
              <Bell className="h-4 w-4" />
            </button>
          </header>

          {userError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
              Erro ao validar permissões: {userError.message}
            </div>
          ) : blocked ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Acesso restrito: esta área é exclusiva para super_admin.
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Usuários ativos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-end justify-between gap-3 pb-5">
                    <div className="flex flex-col">
                      <span className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
                        {loading ? "—" : activeUsers}
                      </span>
                      <span className="mt-1 text-[11px] text-slate-400">
                        Base: usuarios_sistema (ativo = true)
                      </span>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      <UserCheck className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Faturamento geral
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-end justify-between gap-3 pb-5">
                    <div className="flex flex-col">
                      <span className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
                        {loading ? "—" : formatBRLFromCents(totalRevenueCents)}
                      </span>
                      <span className="mt-1 text-[11px] text-slate-400">
                        Soma dos planos de assinaturas ACTIVE
                      </span>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Cancelamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-end justify-between gap-3 pb-5">
                    <div className="flex flex-col">
                      <span className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
                        {loading ? "—" : cancellations}
                      </span>
                      <span className="mt-1 text-[11px] text-slate-400">
                        Status CANCELED em subscription_enrollments
                      </span>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
                      <UserX className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section>
                <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Assinaturas recorrentes mensais (cumulativo)
                    </CardTitle>
                    <p className="text-xs text-slate-400">
                      Baseado nas assinaturas com status ACTIVE, agrupadas por mês (últimos 12 meses).
                    </p>
                  </CardHeader>
                  <CardContent className="h-72 px-2 pb-6 pt-2 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
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
                          tick={{ fontSize: 11, fill: "#64748B" }}
                          allowDecimals={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: 12,
                            borderColor: "#E2E8F0",
                            fontSize: 11,
                          }}
                        />
                        <Bar
                          dataKey="cumulative"
                          name="Assinaturas (cumulativo)"
                          barSize={18}
                          radius={[6, 6, 0, 0]}
                          fill="#4f46e5"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}