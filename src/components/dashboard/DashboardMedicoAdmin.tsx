import { useEffect, useState } from "react";
import {
  ReceiptText,
  DollarSign,
  MailX,
  ArrowUpRight,
  Building2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

type MonthBar = { month: string; valor: number };
type InstituicaoRow = { nome: string; quantidade: number };
type TipoCirurgiaSlice = { name: string; value: number };

const PIE_COLORS = [
  "#38bdf8", "#22c55e", "#f97316", "#a78bfa", "#f43f5e",
  "#facc15", "#14b8a6", "#e879f9", "#fb923c", "#6366f1",
];

type Stats = {
  qtdFaturamentos: number;
  valorFaturado: number;
  emailsNaoEnviados: number;
};

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function buildLast12Months(): { key: string; label: string }[] {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    months.push({ key, label });
  }
  return months;
}

export default function DashboardMedicoAdmin() {
  const [stats, setStats] = useState<Stats>({
    qtdFaturamentos: 0,
    valorFaturado: 0,
    emailsNaoEnviados: 0,
  });
  const [chartData, setChartData] = useState<MonthBar[]>([]);
  const [instituicoes, setInstituicoes] = useState<InstituicaoRow[]>([]);
  const [tipoCirurgiaData, setTipoCirurgiaData] = useState<TipoCirurgiaSlice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // ── Busca faturamentos (para qtd, emails e hospital_nome) ──
      const { data: fats, error: fatError } = await supabase
        .from("faturamentos")
        .select(
          "id, email_status, hospital_nome, data_cirurgia, created_at, guia_solicitacao_id, tipo_cirurgia"
        )
        .eq("status", "ATIVO");

      if (cancelled) return;
      if (fatError || !fats) { setLoading(false); return; }

      // ── Busca itens via guia_solicitacao para somar valor_total ──
      const { data: itens, error: itensError } = await supabase
        .from("itens_guia_solicitacao")
        .select("valor_total, data_procedimento, guia_id");

      if (cancelled) return;

      const itensData = itensError ? [] : (itens ?? []);

      // Mapa guia_id → faturamento (para cruzar datas e hospital)
      const guiaToFat: Record<string, typeof fats[0]> = {};
      fats.forEach((f) => {
        if (f.guia_solicitacao_id) guiaToFat[f.guia_solicitacao_id] = f;
      });

      // ── KPIs ──
      const qtdFaturamentos = fats.length;
      const valorFaturado = itensData.reduce(
        (acc, r) => acc + toNumber(r.valor_total),
        0
      );
      const emailsNaoEnviados = fats.filter(
        (r) => r.email_status === "NAO_ENVIADO"
      ).length;

      setStats({ qtdFaturamentos, valorFaturado, emailsNaoEnviados });

      // ── Gráfico: valor faturado por mês (últimos 12) ──
      const months = buildLast12Months();
      const monthMap: Record<string, number> = {};
      months.forEach(({ key }) => (monthMap[key] = 0));

      itensData.forEach((item) => {
        let dateStr = item.data_procedimento as string | null;
        if (!dateStr && item.guia_id) {
          const fat = guiaToFat[item.guia_id];
          dateStr = fat?.data_cirurgia ?? fat?.created_at?.slice(0, 10) ?? null;
        }
        if (!dateStr) return;
        const key = dateStr.slice(0, 7);
        if (key in monthMap) {
          monthMap[key] += toNumber(item.valor_total);
        }
      });

      setChartData(
        months.map(({ key, label }) => ({
          month: label.charAt(0).toUpperCase() + label.slice(1),
          valor: monthMap[key],
        }))
      );

      // ── Principais instituições (por número de faturamentos) ──
      const instMap: Record<string, number> = {};
      fats.forEach((r) => {
        const nome = r.hospital_nome?.trim() || "Não informado";
        instMap[nome] = (instMap[nome] ?? 0) + 1;
      });

      const sorted = Object.entries(instMap)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);

      setInstituicoes(sorted);

      // ── Gráfico pizza: tipos de cirurgia ──
      const tipoMap: Record<string, number> = {};
      fats.forEach((r) => {
        const tipo = r.tipo_cirurgia?.trim() || "Não informado";
        tipoMap[tipo] = (tipoMap[tipo] ?? 0) + 1;
      });

      const tipoSlices = Object.entries(tipoMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setTipoCirurgiaData(tipoSlices);

      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const kpis = [
    {
      id: "qtd",
      title: "Faturamentos",
      value: loading ? "—" : String(stats.qtdFaturamentos),
      helper: "registros ativos",
      icon: ReceiptText,
      iconBg: "bg-sky-500",
    },
    {
      id: "valor",
      title: "Valor Faturado",
      value: loading ? "—" : formatCurrency(stats.valorFaturado),
      helper: "total acumulado",
      icon: DollarSign,
      iconBg: "bg-emerald-500",
    },
    {
      id: "emails",
      title: "E-mails não enviados",
      value: loading ? "—" : String(stats.emailsNaoEnviados),
      helper: "faturamentos pendentes",
      icon: MailX,
      iconBg: "bg-rose-500",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs + Gráfico pizza */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.id}
              className="border-0 bg-[#0B1829] text-white shadow-[0_18px_40px_rgba(15,23,42,0.45)]"
            >
              <CardContent className="flex h-36 flex-col rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                      {kpi.title}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{kpi.value}</p>
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${kpi.iconBg} text-white shadow-md`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2 text-[11px] text-emerald-300">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>{kpi.helper}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* 4º card: Gráfico pizza tipos de cirurgia */}
        <Card className="border-0 bg-[#0B1829] text-white shadow-[0_18px_40px_rgba(15,23,42,0.45)]">
          <CardContent className="flex h-36 flex-col rounded-3xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
              Tipos de Cirurgia
            </p>
            <div className="flex-1 mt-1">
              {loading ? (
                <div className="flex h-full items-center justify-center text-[11px] text-slate-400">
                  Carregando...
                </div>
              ) : tipoCirurgiaData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-[11px] text-slate-400">
                  Sem dados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tipoCirurgiaData}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={38}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {tipoCirurgiaData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #334155",
                        backgroundColor: "#1e293b",
                        fontSize: 11,
                        color: "#e2e8f0",
                      }}
                      formatter={(value: number, name: string) => [
                        `${value}`,
                        name,
                      ]}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      iconSize={6}
                      wrapperStyle={{ fontSize: 10, color: "#94a3b8", lineHeight: "16px", right: 0 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Gráfico + Instituições */}
      <section className="grid gap-4 lg:grid-cols-5">
        {/* Gráfico de barras */}
        <Card className="lg:col-span-3 rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Valor faturado por mês
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Últimos 12 meses — faturamentos ativos
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 px-2 pb-6 pt-2 sm:h-80">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Carregando...
              </div>
            ) : (
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
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: 12,
                      borderColor: "#E2E8F0",
                      fontSize: 11,
                    }}
                    formatter={(v: number) => [formatCurrency(v), "Valor"]}
                  />
                  <Bar
                    dataKey="valor"
                    name="Valor faturado"
                    barSize={20}
                    radius={[4, 4, 0, 0]}
                    fill="#38bdf8"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Principais instituições */}
        <Card className="lg:col-span-2 rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Principais instituições
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Por número de faturamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-0 pb-3">
            {loading ? (
              <p className="text-xs text-slate-400 px-2 py-4">Carregando...</p>
            ) : instituicoes.length === 0 ? (
              <p className="text-xs text-slate-400 px-2 py-4">
                Nenhum faturamento encontrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#D9DEE3] text-xs text-slate-500 dark:border-slate-800">
                    <TableHead>Instituição</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instituicoes.map((inst, index) => (
                    <TableRow
                      key={inst.nome}
                      className="border-b border-slate-50 text-xs hover:bg-[#F5F7F9] dark:border-slate-800 [&>td]:py-2"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-[11px] font-semibold text-slate-400">
                            {index + 1}º
                          </span>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                          <span className="text-xs font-medium text-slate-900 dark:text-slate-50 truncate max-w-[120px]">
                            {inst.nome}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-900 dark:text-slate-50">
                        {inst.quantidade}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}