import { useEffect, useMemo, useState } from "react";
import { BarChart3, DollarSign, UserCheck, UserX } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  BarChart,
} from "recharts";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSystemUser } from "@/hooks/use-system-user";

type MonthlyPoint = { month: string; cumulative: number };
type PiePoint = { name: string; value: number; color: string };

type EnrollmentRow = {
  status: string | null;
  created_at: string | null;
  started_at: string | null;
  plan:
    | { price_cents: number; code: string | null; name: string | null }
    | { price_cents: number; code: string | null; name: string | null }[]
    | null;
};

const PIE_COLORS: Record<string, string> = {
  Básico: "#2ECC71",
  Intermediário: "#4A90E2",
  Avançado: "#D4A017",
  Outros: "#8A8A8A",
};

function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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

function formatBRLFromCents(cents: number) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
    !userLoading && (!systemUser || systemUser.regra !== "SUPER_ADMIN");

  const monthsKeys = useMemo(() => nextMonthsKeys(12), []);

  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState(0);
  const [revenueCents, setRevenueCents] = useState(0);
  const [cancelations, setCancelations] = useState(0);
  const [barData, setBarData] = useState<MonthlyPoint[]>([]);
  const [pieData, setPieData] = useState<PiePoint[]>([]);

  useEffect(() => {
    if (blocked) return;

    const load = async () => {
      setLoading(true);

      // 1) Usuários ativos
      const { count: usersCount, error: usersError } = await supabase
        .from("usuarios_sistema")
        .select("id_user", { head: true, count: "exact" })
        .eq("ativo", true);

      if (usersError) {
        showError(usersError.message);
        setLoading(false);
        return;
      }

      setActiveUsers(usersCount ?? 0);

      // 2) Assinaturas + join do plano
      const { data, error } = await supabase.from("subscription_enrollments")
        .select("status,created_at,started_at,plan:subscription_plans(price_cents,code,name)");

      if (error) {
        showError(error.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as unknown as EnrollmentRow[];

      const activeRows = rows.filter((r) => isActiveStatus(r.status));
      const canceledRows = rows.filter((r) => isCanceledStatus(r.status));

      setCancelations(canceledRows.length);

      // Receita: soma do price_cents do plano nas assinaturas ativas
      const revenue = activeRows.reduce((acc, r) => {
        const plan = pickPlan(r.plan);
        return acc + (plan?.price_cents ?? 0);
      }, 0);
      setRevenueCents(revenue);

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

      setLoading(false);
    };

    void load();
  }, [blocked, monthsKeys]);

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.10)_0,rgba(18,18,18,0.0)_45%),radial-gradient(circle_at_100%_50%,rgba(212,160,23,0.08)_0,rgba(18,18,18,0.0)_45%)]" />

      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="assinaturas" assinaturasSubsection="dashboard" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-card/70 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.45)] ring-1 ring-border backdrop-blur-xl">
          <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold sm:text-2xl">
                Dashboard de Assinaturas
              </h1>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Visão geral • próximos 12 meses (mês atual + 11)
              </p>
            </div>

            {/* Sino + perfil */}
            <AdminHeaderActions />
          </header>

          {userError ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive-foreground">
              Erro ao validar permissões: {userError.message}
            </div>
          ) : blocked ? (
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
              Acesso restrito: esta área é exclusiva para super_admin.
            </div>
          ) : (
            <>
              {/* Métricas */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="rounded-3xl border border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      <span>Usuários ativos</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                        <UserCheck className="h-4 w-4" />
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-5">
                    <div className="text-3xl font-semibold">
                      {loading ? "—" : activeUsers}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Base: usuarios_sistema (ativo = true)
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      <span>Faturamento geral</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
                        <DollarSign className="h-4 w-4" />
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-5">
                    <div className="text-3xl font-semibold">
                      {loading ? "—" : formatBRLFromCents(revenueCents)}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Soma dos planos das assinaturas ativas
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      <span>Cancelamentos</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-destructive/15 text-destructive ring-1 ring-destructive/20">
                        <UserX className="h-4 w-4" />
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-5">
                    <div className="text-3xl font-semibold">
                      {loading ? "—" : cancelations}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Status "CANCELED/Cancelado" (dependendo do banco)
                    </p>
                  </CardContent>
                </Card>
              </section>

              {/* Gráficos */}
              <section className="grid gap-4 lg:grid-cols-5">
                <Card className="rounded-3xl border border-border bg-card lg:col-span-3">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/15">
                        <BarChart3 className="h-4 w-4" />
                      </span>
                      Assinaturas mensais (cumulativo)
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Mês atual + próximos 11 meses
                    </p>
                  </CardHeader>

                  <CardContent className="h-72 px-2 pb-6 pt-2 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(138,138,138,0.35)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "rgba(138,138,138,0.9)" }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "rgba(138,138,138,0.9)" }}
                          allowDecimals={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: 14,
                            borderColor: "rgba(46,46,46,1)",
                            background: "rgba(26,26,26,0.95)",
                            color: "#F5F5F5",
                            fontSize: 11,
                          }}
                        />
                        <Bar
                          dataKey="cumulative"
                          name="Assinaturas"
                          barSize={18}
                          radius={[6, 6, 0, 0]}
                          fill="#D4A017"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border border-border bg-card lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      Assinaturas por plano
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Quantidade de assinaturas ativas por categoria
                    </p>
                  </CardHeader>

                  <CardContent className="h-72 px-2 pb-6 pt-2 sm:h-80">
                    {pieData.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Nenhuma assinatura ativa para exibir.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: 14,
                              borderColor: "rgba(46,46,46,1)",
                              background: "rgba(26,26,26,0.95)",
                              color: "#F5F5F5",
                              fontSize: 11,
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            wrapperStyle={{
                              fontSize: 11,
                              color: "rgba(138,138,138,0.95)",
                            }}
                          />
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="45%"
                            outerRadius={92}
                            innerRadius={52}
                            paddingAngle={2}
                            labelLine={false}
                            label={renderPieValueLabel}
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    )}
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