import {
  Users,
  Activity,
  CheckCircle2,
  MessageCircle,
  Search,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { contarDescricoesCirurgicasPorStatus } from "@/services/descricao-cirurgica-service";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import GlosaGauge from "@/components/dashboard/GlosaGauge";
import RegionBubbleMap from "@/components/dashboard/RegionBubbleMap";
import DashboardMedicoAdmin from "@/components/dashboard/DashboardMedicoAdmin";
import SubscriptionServicesStatusCard from "@/components/subscriptions/SubscriptionServicesStatusCard";
import { useSystemUser } from "@/hooks/use-system-user";
import { useSuperAdminMetrics } from "@/hooks/use-superadmin-metrics";
import { useSuperAdminChartData } from "@/hooks/use-superadmin-chart-data";

const clinicOptions = [
  { id: "todas", name: "Todas as clínicas" },
  { id: "clinica-centro", name: "Clínica Centro" },
  { id: "clinica-zona-sul", name: "Clínica Zona Sul" },
];

const doctorOptions = [
  { id: "todos", name: "Todos os médicos" },
  { id: "dra-maria-silva", name: "Dra. Maria Silva" },
  { id: "dr-carlos-pereira", name: "Dr. Carlos Pereira" },
  { id: "dra-ana-costa", name: "Dra. Ana Costa" },
];

type TopMetric = {
  id: string;
  title: string;
  value: string;
  helper: string;
  icon: any;
  iconBg: string;
  isGauge?: boolean;
  gaugeValue?: number;
};

const topMetrics: TopMetric[] = [
  {
    id: "medicos",
    title: "Quantidade de médicos",
    value: "32",
    helper: "4 neste mês",
    icon: Users,
    iconBg: "bg-sky-500",
  },
  {
    id: "sadts-atendidos",
    title: "Faturamentos atendidos",
    value: "2,8 mil",
    helper: "320 vs. mês anterior",
    icon: Activity,
    iconBg: "bg-violet-500",
  },
  {
    id: "glosa-recuperada",
    title: "Glosa recuperada",
    value: "84%",
    helper: "+12% vs. mês anterior",
    icon: CheckCircle2,
    iconBg: "bg-emerald-500",
    isGauge: true,
    gaugeValue: 84,
  },
  {
    id: "valor-glosa-recuperado",
    title: "Valor de glosa recuperado",
    value: "R$ 180 mil",
    helper: "R$ 25 mil no mês",
    icon: MessageCircle,
    iconBg: "bg-emerald-500",
  },
];

const yearlySadtData = [
  { month: "Jan", enviadas: 65, pagas: 48, glosa: 12 },
  { month: "Fev", enviadas: 59, pagas: 42, glosa: 10 },
  { month: "Mar", enviadas: 80, pagas: 60, glosa: 15 },
  { month: "Abr", enviadas: 81, pagas: 55, glosa: 13 },
  { month: "Mai", enviadas: 56, pagas: 40, glosa: 11 },
  { month: "Jun", enviadas: 55, pagas: 38, glosa: 10 },
  { month: "Jul", enviadas: 70, pagas: 52, glosa: 16 },
  { month: "Ago", enviadas: 75, pagas: 58, glosa: 17 },
  { month: "Set", enviadas: 88, pagas: 68, glosa: 18 },
  { month: "Out", enviadas: 92, pagas: 72, glosa: 19 },
  { month: "Nov", enviadas: 101, pagas: 78, glosa: 21 },
  { month: "Dez", enviadas: 110, pagas: 85, glosa: 23 },
];

const topDoctorsByRevenue = [
  {
    id: "dr-carlos-pereira",
    name: "Dr. Carlos Pereira",
    specialty: "Ortopedia",
    avatar:
      "https://images.pexels.com/photos/5327581/pexels-photo-5327581.jpeg?auto=compress&cs=tinysrgb&w=160",
    sadtCount: 184,
    revenue: "R$ 320.450,00",
    growth: "+12,4%",
  },
  {
    id: "dra-ana-costa",
    name: "Dra. Ana Costa",
    specialty: "Cardiologia",
    avatar:
      "https://images.pexels.com/photos/5327657/pexels-photo-5327657.jpeg?auto=compress&cs=tinysrgb&w=160",
    sadtCount: 162,
    revenue: "R$ 295.870,00",
    growth: "+9,1%",
  },
  {
    id: "dr-joao-almeida",
    name: "Dr. João Almeida",
    specialty: "Cirurgia Geral",
    avatar: "/perfil.jpeg",
    sadtCount: 148,
    revenue: "R$ 268.300,00",
    growth: "+7,8%",
  },
  {
    id: "dra-maria-silva",
    name: "Dra. Maria Silva",
    specialty: "Ginecologia",
    avatar:
      "https://images.pexels.com/photos/8460151/pexels-photo-8460151.jpeg?auto=compress&cs=tinysrgb&w=160",
    sadtCount: 131,
    revenue: "R$ 241.920,00",
    growth: "+5,2%",
  },
  {
    id: "dr-ricardo-lima",
    name: "Dr. Ricardo Lima",
    specialty: "Neurologia",
    avatar:
      "https://images.pexels.com/photos/8376304/pexels-photo-8376304.jpeg?auto=compress&cs=tinysrgb&w=160",
    sadtCount: 119,
    revenue: "R$ 225.110,00",
    growth: "+4,6%",
  },
];

// Configuração do ChartContainer para o gráfico principal do dashboard
const dashboardChartConfig = {
  enviadas: {
    label: "Faturamentos enviados",
    color: "#38bdf8",
  },
  pagas: {
    label: "Faturamentos pagos",
    color: "#22c55e",
  },
  glosa: {
    label: "Glosa",
    color: "#f97316",
  },
} satisfies ChartConfig;

const Dashboard = () => {
  const [selectedClinic, setSelectedClinic] = useState<string>("todas");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("todos");
  const [pendingDescricoes, setPendingDescricoes] = useState<number>(0);
  const { systemUser, loading: systemUserLoading } = useSystemUser();

  const role = String((systemUser as any)?.regra ?? "").trim().toUpperCase();
  const isMedico = role === "MEDICO";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const { metrics: saMetrics, loading: saLoading } = useSuperAdminMetrics(
    !systemUserLoading && isSuperAdmin
  );

  const { chartData: saChartData, topDoctors: saTopDoctors, loading: saChartLoading } =
    useSuperAdminChartData(!systemUserLoading && isSuperAdmin);

  // Dados do gráfico: reais para super_admin, mock para outros
  const activeChartData = isSuperAdmin ? saChartData : yearlySadtData;

  // Ranking de médicos: reais para super_admin, mock para outros
  const activeTopDoctors = isSuperAdmin ? saTopDoctors : topDoctorsByRevenue;

  // Formata número grande: 2800 → "2,8 mil"
  const formatCount = (n: number | null): string => {
    if (n === null) return "—";
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")} mil`;
    return String(n);
  };

  // Cards dinâmicos para super_admin
  const superAdminMetrics = [
    {
      id: "medicos",
      title: "Quantidade de médicos",
      value: saLoading ? "..." : formatCount(saMetrics.totalMedicos),
      helper: "Assinaturas ativas / em trial",
      icon: Users,
      iconBg: "bg-sky-500",
      isGauge: false,
    },
    {
      id: "faturamentos",
      title: "Faturamentos atendidos",
      value: saLoading ? "..." : formatCount(saMetrics.totalFaturamentos),
      helper: "Total geral da base",
      icon: Activity,
      iconBg: "bg-violet-500",
      isGauge: false,
    },
    {
      id: "glosa-recuperada",
      title: "Glosa recuperada",
      value: "—",
      helper: "Sem dados disponíveis",
      icon: CheckCircle2,
      iconBg: "bg-slate-500",
      isGauge: false,
    },
    {
      id: "valor-glosa-recuperado",
      title: "Valor de glosa recuperado",
      value: "—",
      helper: "Sem dados disponíveis",
      icon: MessageCircle,
      iconBg: "bg-slate-500",
      isGauge: false,
    },
  ];

  const activeMetrics = isSuperAdmin ? superAdminMetrics : topMetrics;

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      (parts[0]?.charAt(0) ?? "").toUpperCase() +
      (parts[parts.length - 1]?.charAt(0) ?? "").toUpperCase()
    );
  };

  useEffect(() => {
    const fetchPendingDescricoes = async () => {
      try {
        const count = await contarDescricoesCirurgicasPorStatus("AGUARDANDO");
        setPendingDescricoes(count);
      } catch {
        // Falha ao carregar notificações não deve quebrar o dashboard
      }
    };

    void fetchPendingDescricoes();
  }, []);

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="home" />

        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          {/* Header */}
          <header className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col">
              <h1 className="text-[26px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Dashboard
              </h1>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                {isMedico
                  ? "Visão geral dos seus faturamentos."
                  : "Visão geral dos Faturamentos, descrições cirúrgicas e faturamento."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full bg-[#F5F7F9] px-3 py-1 text-sm text-slate-600 ring-1 ring-[#D9DEE3] focus-within:ring-[#1D4E77] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 sm:flex">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar"
                  className="h-7 w-40 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-50 sm:w-52 sm:text-sm"
                />
              </div>
              <AdminHeaderActions notificationsCount={pendingDescricoes} />
            </div>
          </header>

          {/* Conteúdo */}
          <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:bg-slate-900/90">
            {systemUserLoading && (
              <div className="flex flex-1 flex-col gap-4 py-4">
                {/* KPI cards skeleton */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-44 rounded-3xl bg-slate-100" />
                  ))}
                </div>
                {/* Charts skeleton */}
                <div className="grid gap-4 lg:grid-cols-5">
                  <Skeleton className="lg:col-span-3 h-80 rounded-3xl bg-slate-100" />
                  <Skeleton className="lg:col-span-2 h-80 rounded-3xl bg-slate-100" />
                </div>
              </div>
            )}

            {!systemUserLoading && isMedico && <DashboardMedicoAdmin />}

            {!systemUserLoading && !isMedico && (
              <>
                {isSuperAdmin ? (
                  <section>
                    <SubscriptionServicesStatusCard />
                  </section>
                ) : null}

                {/* Filtros principais */}
                <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-2">
                  <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-200">
                        Clínica
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-400">
                        Filtrar por unidade
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                        <SelectTrigger className="h-10 w-full rounded-2xl text-sm">
                          <SelectValue placeholder="Selecione a clínica" />
                        </SelectTrigger>
                        <SelectContent>
                          {clinicOptions.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-200">
                        Médico
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-400">
                        Filtrar por médico
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-1">
                      <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                        <SelectTrigger className="h-10 w-full rounded-2xl text-sm">
                          <SelectValue placeholder="Selecione o médico" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctorOptions.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                </section>

                {/* Cards de métricas */}
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {activeMetrics.map((metric) => {
                    const Icon = metric.icon;
                    const isGauge = metric.isGauge;
                    const noData = metric.value === "—";

                    return (
                      <div
                        key={metric.id}
                        className="flex min-h-[196px] flex-col justify-between rounded-2xl border border-slate-700/60 bg-gradient-to-b from-[#0d1b2e] to-[#091422] p-5 text-white"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="max-w-[170px] text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            {metric.title}
                          </p>
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${metric.iconBg} text-white`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                        </div>

                        {isGauge ? (
                          <div className="flex flex-1 items-center justify-center py-3">
                            <GlosaGauge value={(metric as any).gaugeValue ?? 0} />
                          </div>
                        ) : (
                          <p className={`mt-4 text-center text-3xl font-bold ${noData ? "text-slate-500" : "text-white"}`}>
                            {metric.value}
                          </p>
                        )}

                        <p
                          className={`mt-4 text-[11px] leading-4 ${
                            noData ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          {!noData && (
                            <span className="mr-1 inline-flex items-center text-emerald-300">
                              <ArrowUpRight className="h-3 w-3" />
                            </span>
                          )}
                          {metric.helper}
                        </p>
                      </div>
                    );
                  })}
                </section>

                {/* Gráfico + ranking */}
                <section className="grid gap-4 lg:grid-cols-5">
                  <Card className="lg:col-span-3 rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Faturamentos enviados x pagos x glosa
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Visão consolidada dos últimos 12 meses
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-72 px-2 pb-6 pt-2 sm:h-80">
                      {isSuperAdmin && saChartLoading ? (
                        <div className="flex h-full flex-col gap-2 items-end justify-end px-4 pb-2">
                          <div className="flex items-end gap-2 h-full w-full">
                            {[35, 60, 50, 80, 40, 30, 70, 75, 85, 90, 95, 70].map((h, i) => (
                              <div
                                key={i}
                                className="flex-1 rounded-t bg-slate-100 dark:bg-slate-800 animate-pulse"
                                style={{ height: `${h}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <ChartContainer
                          config={dashboardChartConfig}
                          className="aspect-auto h-full w-full"
                        >
                          <ComposedChart data={activeChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }}
                              tickFormatter={(v) => isSuperAdmin && v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                            />
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  formatter={(value, name) => (
                                    <span className="font-medium text-foreground">
                                      {isSuperAdmin
                                        ? (value as number).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                                        : String(value)}{" "}
                                      <span className="text-muted-foreground">{name as string}</span>
                                    </span>
                                  )}
                                />
                              }
                            />
                            <Bar dataKey="enviadas" name="Faturamentos enviados" barSize={16} radius={[4, 4, 0, 0]} fill="var(--color-enviadas)" />
                            <Bar dataKey="pagas" name="Faturamentos pagos" barSize={16} radius={[4, 4, 0, 0]} fill="var(--color-pagas)" />
                            <Line type="monotone" dataKey="glosa" name="Glosa" stroke="var(--color-glosa)" strokeWidth={2} dot={{ r: 3 }} />
                          </ComposedChart>
                        </ChartContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2 rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Médicos com maior faturamento
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Top 5 médicos por valor faturado no período selecionado
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto pt-0 pb-3">
                      {isSuperAdmin && saChartLoading ? (
                        <div className="space-y-3 py-3">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-1">
                              <Skeleton className="h-4 w-5 rounded" />
                              <Skeleton className="h-7 w-7 rounded-full" />
                              <Skeleton className="h-4 flex-1 rounded" />
                              <Skeleton className="h-4 w-16 rounded" />
                            </div>
                          ))}
                        </div>
                      ) : activeTopDoctors.length === 0 ? (
                        <div className="flex items-center justify-center py-10 text-sm text-slate-400">
                          Sem dados disponíveis
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-[#D9DEE3] text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                              <TableHead>Médico</TableHead>
                              <TableHead className="text-right">Faturamento</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeTopDoctors.map((doctor, index) => (
                              <TableRow
                                key={doctor.id}
                                className="border-b border-slate-50 text-xs hover:bg-[#F5F7F9] dark:border-slate-800 dark:hover:bg-slate-800/60 [&>td]:py-1.5"
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 text-[11px] font-semibold text-slate-400">
                                      {index + 1}º
                                    </span>
                                    <Avatar className="h-7 w-7">
                                      {(doctor as any).avatar ? (
                                        <AvatarImage src={(doctor as any).avatar} alt={doctor.name} />
                                      ) : null}
                                      <AvatarFallback>{getInitials(doctor.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium text-slate-900 dark:text-slate-50">
                                        {doctor.name}
                                      </span>
                                      {(doctor as any).specialty && (
                                        <span className="text-[11px] text-slate-400">
                                          {(doctor as any).specialty}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-xs font-semibold text-slate-900 dark:text-slate-50">
                                  {doctor.revenue}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </section>

                {/* Mapa */}
                <section className="mt-2">
                  <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Médicos atendidos por região
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Distribuição por densidade
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <RegionBubbleMap liveData={isSuperAdmin} />
                    </CardContent>
                  </Card>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;