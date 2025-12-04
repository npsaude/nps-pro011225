import {
  Users,
  Activity,
  CheckCircle2,
  MessageCircle,
  Bell,
  Search,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { contarDescricoesCirurgicasPorStatus } from "@/services/descricao-cirurgica-service";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import GlosaGauge from "@/components/dashboard/GlosaGauge";
import RegionBubbleMap from "@/components/dashboard/RegionBubbleMap";

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
    title: "SADTs atendidos",
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
  { mes: "Jan", enviados: 65, pagos: 48, retornoGlosa: 12 },
  { mes: "Fev", enviados: 59, pagos: 42, retornoGlosa: 10 },
  { mes: "Mar", enviados: 80, pagos: 60, retornoGlosa: 15 },
  { mes: "Abr", enviados: 81, pagos: 55, retornoGlosa: 13 },
  { mes: "Mai", enviados: 56, pagos: 40, retornoGlosa: 11 },
  { mes: "Jun", enviados: 55, pagos: 38, retornoGlosa: 10 },
  { mes: "Jul", enviados: 70, pagos: 52, retornoGlosa: 16 },
  { mes: "Ago", enviados: 75, pagos: 58, retornoGlosa: 17 },
  { mes: "Set", enviados: 88, pagos: 68, retornoGlosa: 18 },
  { mes: "Out", enviados: 92, pagos: 72, retornoGlosa: 19 },
  { mes: "Nov", enviados: 101, pagos: 78, retornoGlosa: 21 },
  { mes: "Dez", enviados: 110, pagos: 85, retornoGlosa: 23 },
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

const Dashboard = () => {
  const [selectedClinic, setSelectedClinic] = useState<string>("todas");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("todos");
  const [pendingDescricoes, setPendingDescricoes] = useState<number>(0);

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

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.12)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                Dashboard
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Visão geral das SADTs, descrições cirúrgicas e faturamento.
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
              <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#E6EEF7] text-slate-600 shadow-sm ring-1 ring-[#D9DEE3]/70 transition-colors hover:bg-[#D9DEE3] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                {pendingDescricoes > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-semibold text-white">
                    {pendingDescricoes > 9 ? "9+" : pendingDescricoes}
                  </span>
                )}
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

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
                <Select
                  value={selectedClinic}
                  onValueChange={setSelectedClinic}
                >
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
                <Select
                  value={selectedDoctor}
                  onValueChange={setSelectedDoctor}
                >
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

          {/* Cards de métricas no novo estilo */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {topMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card
                  key={metric.id}
                  className="border-0 bg-[#0B1829] text-white shadow-[0_18px_40px_rgba(15,23,42,0.45)]"
                >
                  <CardContent className="flex h-40 flex-col justify-between rounded-3xl p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                          {metric.title}
                        </p>
                        {!metric.isGauge && (
                          <p className="mt-1 text-2xl font-semibold">
                            {metric.value}
                          </p>
                        )}
                      </div>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${metric.iconBg} text-white shadow-md`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    {metric.isGauge && (
                      <div className="mt-2 flex justify-center">
                        <GlosaGauge value={metric.gaugeValue ?? 0} />
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-300">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>{metric.helper}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {/* Gráfico de barras + ranking de médicos */}
          <section className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3 rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  SADTs enviadas x pagas x retorno de glosa
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Visão consolidada dos últimos 12 meses
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72 px-2 pb-6 pt-2 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={yearlySadtData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "#E2E8F0",
                        fontSize: 11,
                      }}
                    />
                    <Bar
                      dataKey="enviados"
                      name="Enviados"
                      barSize={16}
                      radius={[4, 4, 0, 0]}
                      fill="#38bdf8"
                    />
                    <Bar
                      dataKey="pagos"
                      name="Pagos"
                      barSize={16}
                      radius={[4, 4, 0, 0]}
                      fill="#22c55e"
                    />
                    <Line
                      type="monotone"
                      dataKey="retornoGlosa"
                      name="Retorno de glosa"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
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
              <CardContent className="overflow-x-auto pt-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#D9DEE3] text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <TableHead>Médico</TableHead>
                      <TableHead className="text-right">SADTs</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Tendência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topDoctorsByRevenue.map((doctor, index) => (
                      <TableRow
                        key={doctor.id}
                        className="border-b border-slate-50 text-xs hover:bg-[#F5F7F9] dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-[11px] font-semibold text-slate-400">
                              {index + 1}º
                            </span>
                            <Avatar className="h-7 w-7">
                              <AvatarImage
                                src={doctor.avatar}
                                alt={doctor.name}
                              />
                              <AvatarFallback>
                                {getInitials(doctor.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-slate-900 dark:text-slate-50">
                                {doctor.name}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {doctor.specialty}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-600 dark:text-slate-200">
                          {doctor.sadtCount.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-slate-900 dark:text-slate-50">
                          {doctor.revenue}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className="border-0 bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            ↑ {doctor.growth}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          {/* Mapa de médicos por região */}
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
                <RegionBubbleMap />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;