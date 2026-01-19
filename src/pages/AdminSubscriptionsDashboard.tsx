import { useEffect, useMemo, useState } from "react";
import { Bell, BarChart3, DollarSign, UserCheck, UserX } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  BarChart,
  Pie,
  PieChart,
  Cell,
  Legend,
} from "recharts";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useSystemUser } from "@/hooks/use-system-user";

type MonthlyPoint = { month: string; cumulative: number };
type PiePoint = { name: string; value: number; color: string };

const PIE_COLORS: Record<string, string> = {
  Básico: "#22c55e",
  Intermediário: "#0ea5e9",
  Avançado: "#a855f7",
  Outros: "#94a3b8",
};

function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("pt-BR", { month: "short" }).replace(".", "");
}

function lastMonths(count: number) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date(first.getFullYear(), first.getMonth() - (count - 1 - i), 1);
    return monthKey(d);
  });
}

function bucketPlan(nameOrCode: string) {
  const t = nameOrCode.toLowerCase();
  if (t.includes("basic")) return "Básico";
  if (t.includes("inter") ) return "Intermediário";
  if (t.includes("avanç") || t.includes("advanced")) return "Avançado";
  return "Outros";
}

export default function AdminSubscriptionsDashboard() {
  const { loading: ul, systemUser, error: ue } = useSystemUser();
  const blocked = !ul && systemUser?.regra !== "SUPER_ADMIN";

  const [activeUsers, setActiveUsers] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [cancels, setCancels] = useState(0);
  const [barData, setBarData] = useState<MonthlyPoint[]>([]);
  const [pieData, setPieData] = useState<PiePoint[]>([]);
  const months = useMemo(() => lastMonths(12), []);

  useEffect(() => {
    if (blocked) return;

    const load = async () => {
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("subscription_enrollments")
        .select<Row>("status,created_at,started_at,plan:subscription_plans(price_cents,code)");
      if (enrollmentsError) throw enrollmentsError;

      type Row = {
        status: string;
        created_at: string | null;
        started_at: string | null;
        plan: { price_cents: number; code: string }[] | { price_cents: number; code: string } | null;
      };

      const rows = (enrollments ?? []) as Row[];
      const act = rows.filter((r) => r.status === "ACTIVE");
      const canc = rows.filter((r) => r.status === "CANCELED");
      setCancels(canc.length);

      const rev = act.reduce((acc, r) => acc + (Array.isArray(r.plan) ? r.plan[0]?.price_cents ?? 0 : r.plan?.price_cents ?? 0), 0);
      setRevenue(rev);

      // Bar chart
      const countMap = new Map<string, number>();
      act.forEach((r) => {
        const dt = new Date(r.started_at || r.created_at || "");
        const key = monthKey(new Date(dt.getFullYear(), dt.getMonth(), 1));
        countMap.set(key, (countMap.get(key) ?? 0) + 1);
      });
      let cum = 0;
      setBarData(months.map((m) => ({ month: monthLabel(m), cumulative: (cum += countMap.get(m) ?? 0) })));

      // Pie chart
      const planMap = new Map<string, number>();
      act.forEach((r) => {
        const p = Array.isArray(r.plan) ? r.plan[0] : r.plan;
        const bucket = bucketPlan(p?.code ?? "");
        planMap.set(bucket, (planMap.get(bucket) ?? 0) + 1);
      });
      setPieData(
        ["Básico", "Intermediário", "Avançado", "Outros"]
          .map((name) => ({ name, value: planMap.get(name) ?? 0, color: PIE_COLORS[name] }))
          .filter((p) => p.value > 0)
      );
    };
    void load();
  }, [blocked, months]);

  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground">
      <div className="flex flex-1 max-w-7xl mx-auto gap-4 px-4 py-6">
        <AdminSidebar section="assinaturas" assinaturasSubsection="dashboard" />

        <div className="flex-1 flex-col space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Dashboard de Assinaturas</h1>
            <button className="p-2 rounded-full bg-secondary text-secondary-foreground">
              <Bell />
            </button>
          </header>

          {ue || blocked ? (
            <p className="text-sm text-muted-foreground">Acesso restrito.</p>
          ) : (
            <>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs uppercase">Usuários ativos</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{activeUsers}</CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs uppercase">Faturamento geral</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{(revenue/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs uppercase">Cancelamentos</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{cancels}</CardContent>
                </Card>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Assinaturas Mensais (cumulativo)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip />
                        <Bar dataKey="cumulative" fill="#4f46e5" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Assinaturas por Plano</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                          const RADIAN = Math.PI / 180;
                          const r = innerRadius + (outerRadius - innerRadius) * 0.6;
                          const x = cx + r * Math.cos(-midAngle * RADIAN);
                          const y = cy + r * Math.sin(-midAngle * RADIAN);
                          return <text x={x} y={y} fill={PIE_COLORS["Básico"]} textAnchor="middle" dominantBaseline="central" className="text-xs font-semibold">{value}</text>;
                        }}>
                          {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Legend verticalAlign="bottom" />
                        <RechartsTooltip />
                      </PieChart>
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