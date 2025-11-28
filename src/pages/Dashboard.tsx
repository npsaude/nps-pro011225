import {
  Home,
  FileText,
  Users,
  Stethoscope,
  MessageCircle,
  Settings,
  HelpCircle,
  Bell,
  Search,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
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
import { useState } from "react";

const sidebarItems = [
  { label: "Home", icon: Home, active: true },
  { label: "SADTs", icon: FileText, active: false },
  { label: "Pacientes", icon: Users, active: false },
  { label: "Procedimentos", icon: Stethoscope, active: false },
  { label: "Mensagens", icon: MessageCircle, active: false, badge: 2 },
  { label: "Configurações", icon: Settings, active: false },
  { label: "Ajuda", icon: HelpCircle, active: false },
];

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

const topMetrics = [
  {
    title: "Quantidade de médicos",
    value: "32",
    helper: "↑ 4 neste mês",
    gradient: "from-sky-400 to-blue-500",
    icon: Users,
  },
  {
    title: "SADTs atendidos",
    value: "2,8 mil",
    helper: "↑ 320 vs. mês anterior",
    gradient: "from-fuchsia-400 to-violet-500",
    icon: Stethoscope,
  },
  {
    title: "Receita no ano",
    value: "R$ 1,2 mi",
    helper: "↑ R$ 120 mil no ano",
    gradient: "from-indigo-500 to-slate-700",
    icon: FileText,
  },
  {
    title: "Índice de glosa",
    value: "5,3%",
    helper: "↓ 0,7 p.p.",
    gradient: "from-amber-400 to-orange-500",
    icon: HelpCircle,
  },
  {
    title: "Valor de glosa recuperado",
    value: "R$ 180 mil",
    helper: "↑ R$ 25 mil no mês",
    gradient: "from-emerald-400 to-teal-500",
    icon: MessageCircle,
  },
];

// Dados mensais inspirados no exemplo fornecido (12 meses)
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

const activities = [
  {
    id: 1,
    tipo: "Nova SADT",
    descricao: "SADT criada para o paciente Maria Silva",
    tempo: "Há 5 minutos",
    color: "bg-emerald-500/15 text-emerald-700",
  },
  {
    id: 2,
    tipo: "Lembrete",
    descricao: "Cobrança enviada ao convênio Vida Mais",
    tempo: "Hoje, 10:23",
    color: "bg-amber-500/15 text-amber-700",
  },
  {
    id: 3,
    tipo: "Glosa",
    descricao: "Nova glosa recebida do convênio Bem Estar",
    tempo: "Ontem, 18:04",
    color: "bg-rose-500/15 text-rose-700",
  },
];

const recentSadt = [
  {
    protocolo: "SADT-2024-13451",
    data: "03 Jul, 2024",
    paciente: "Carlos Pereira",
    valor: "R$ 2.450,00",
    status: "PAGA",
    statusColor: "bg-emerald-100 text-emerald-700",
  },
  {
    protocolo: "SADT-2024-13398",
    data: "28 Jun, 2024",
    paciente: "Ana Costa",
    valor: "R$ 1.280,00",
    status: "EM ANÁLISE",
    statusColor: "bg-amber-100 text-amber-700",
  },
  {
    protocolo: "SADT-2024-13340",
    data: "25 Jun, 2024",
    paciente: "João Almeida",
    valor: "R$ 980,00",
    status: "GLOSA",
    statusColor: "bg-rose-100 text-rose-700",
  },
  {
    protocolo: "SADT-2024-13290",
    data: "20 Jun, 2024",
    paciente: "Luciana Lima",
    valor: "R$ 3.120,00",
    status: "PAGA",
    statusColor: "bg-emerald-100 text-emerald-700",
  },
];

const Dashboard = () => {
  const [selectedClinic, setSelectedClinic] = useState<string>("todas");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("todos");

  return (
    <div className="relative flex min-h-screen w-full bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Fundo em gradiente suave */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#e5f0ff] via-[#f8fbff] to-[#e3eeff] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      {/* Container principal */}
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        {/* Sidebar */}
        <aside className="hidden w-60 flex-col justify-between rounded-3xl bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:bg-slate-900/90 lg:flex">
          <div className="flex flex-col gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#135bec]">
                <img
                  src="/logo.jpeg"
                  alt="Logo NP Saúde Pró"
                  className="h-8 w-8 rounded-xl object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-50">
                  NP Saúde Pró
                </span>
                <span className="text-xs text-slate-400">
                  Painel administrativo
                </span>
              </div>
            </div>

            {/* Menu */}
            <nav className="flex flex-col gap-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.active;

                return (
                  <button
                    key={item.label}
                    className={`flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all ${
                      isActive
                        ? "bg-[#135bec] text-white shadow-md shadow-blue-500/40"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 text-[11px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Logout */}
          <button className="mt-4 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <HelpCircle className="h-4 w-4" />
            </span>
            <span>Sair</span>
          </button>
        </aside>

        {/* Área principal */}
        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-transparent lg:bg-white/80 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl dark:lg:bg-slate-900/90">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                Dashboard
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">
                Visão geral das SADTs e faturamento da sua clínica.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Campo de busca */}
              <div className="hidden items-center rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-200/80 focus-within:ring-[#135bec] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 sm:flex">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar"
                  className="h-7 w-40 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-50 sm:w-52 sm:text-sm"
                />
              </div>

              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm ring-1 ring-slate-200/70 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                <Bell className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2 rounded-full bg-slate-100/70 px-2 py-1.5 text-xs shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800/70 dark:ring-slate-700 sm:px-3">
                <img
                  src="/perfil.jpeg"
                  alt="Foto de Jurandy Pessoa"
                  className="h-8 w-8 rounded-full object-cover"
                />
                <div className="hidden flex-col text-left sm:flex">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                    Jurandy Pessoa
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Administrador
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Filtros por clínica e médico */}
          <div className="mt-1 flex flex-col gap-3 rounded-3xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100/80 dark:bg-slate-900/90 dark:ring-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xs">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-100">
                Filtro por clínicas e médicos
              </p>
              <p className="text-[11px] text-slate-400">
                Ajuste os indicadores de acordo com a unidade e o profissional.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-full sm:w-56">
                <Select
                  value={selectedClinic}
                  onValueChange={setSelectedClinic}
                >
                  <SelectTrigger className="h-9 rounded-2xl border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <SelectValue placeholder="Selecione a clínica" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinicOptions.map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-56">
                <Select
                  value={selectedDoctor}
                  onValueChange={setSelectedDoctor}
                >
                  <SelectTrigger className="h-9 rounded-2xl border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <SelectValue placeholder="Selecione o médico" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctorOptions.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          <main className="flex flex-1 flex-col gap-4">
            {/* Linha de cards + CTA lateral */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
              {/* Cards de métricas - layout em gradiente */}
              <div className="grid gap-3 rounded-3xl bg-transparent sm:grid-cols-2 xl:grid-cols-5">
                {topMetrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div
                      key={metric.title}
                      className={`flex flex-col justify-between rounded-3xl bg-gradient-to-r ${metric.gradient} px-4 py-3 text-white shadow-[0_16px_35px_rgba(15,23,42,0.25)]`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-medium opacity-90">
                            {metric.title}
                          </p>
                          <p className="mt-1 text-lg font-semibold sm:text-xl">
                            {metric.value}
                          </p>
                        </div>
                        <div className="flex h-7 w-7 items-center justify-center rounded-2xl bg-white/20">
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                      {metric.helper && (
                        <p className="mt-2 text-[11px] font-semibold text-emerald-100">
                          {metric.helper}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Card promocional à direita */}
              <div className="flex flex-col justify-between rounded-3xl bg-[#135bec] px-5 py-5 text-white shadow-[0_18px_60px_rgba(37,99,235,0.55)]">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
                  NOVO
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold leading-tight">
                    Novos recursos para gestão de SADT
                  </h2>
                  <p className="text-xs text-sky-100 sm:text-sm">
                    Acompanhe glosas, autorizações e faturamento em tempo real
                    com o painel NP Saúde Pró.
                  </p>
                </div>
                <button className="mt-5 flex h-10 w-full items-center justify-center rounded-full bg-white text-xs font-semibold text-[#135bec] shadow-lg transition-transform hover:translate-y-0.5 sm:text-sm">
                  Conhecer agora
                </button>
              </div>
            </div>

            {/* Gráfico de linha inspirado no exemplo */}
            <section className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
              <Card className="rounded-3xl border-none bg-white/80 shadow-sm ring-1 ring-slate-100/80 dark:bg-slate-900/90 dark:ring-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg text-slate-900 dark:text-slate-50">
                        Análise Mensal de SADTs
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Número de SADTs enviados, pagos e retorno por glosa ao
                        longo do ano.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] sm:text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-slate-500 dark:text-slate-400">
                          Número de SADTs enviados
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-slate-500 dark:text-slate-400">
                          SADTs pagos
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-violet-500" />
                        <span className="text-slate-500 dark:text-slate-400">
                          Retorno por glosa (R$ mil)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge className="rounded-full bg-slate-900/90 px-3 py-1 text-[11px] font-medium text-white shadow-md dark:bg-slate-100 dark:text-slate-900">
                      Ano de 2024 · Dados mensais
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={yearlySadtData}
                      margin={{ top: 8, right: 16, left: -20, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient
                          id="enviadosGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#3b82f6"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="100%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="pagosGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#22c55e"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="100%"
                            stopColor="#22c55e"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="glosaGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#8b5cf6"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="100%"
                            stopColor="#8b5cf6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        stroke="rgba(148, 163, 184, 0.35)"
                      />
                      <XAxis
                        dataKey="mes"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickMargin={8}
                      />
                      <RechartsTooltip
                        cursor={{
                          stroke: "rgba(148, 163, 184, 0.45)",
                          strokeWidth: 1,
                        }}
                        contentStyle={{
                          backgroundColor: "rgba(15,23,42,0.98)",
                          borderRadius: 12,
                          border: "1px solid rgba(100,116,139,0.5)",
                          padding: "8px 10px",
                          fontSize: 12,
                          color: "#e2e8f0",
                        }}
                        labelStyle={{
                          color: "#f9fafb",
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                        formatter={(value: unknown, name: unknown) => {
                          if (name === "Retorno por glosa (R$ mil)") {
                            return `R$ ${(value as number).toLocaleString(
                              "pt-BR",
                            )} mil`;
                          }
                          return (value as number).toLocaleString("pt-BR");
                        }}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="enviados"
                        name="Número de SADTs enviados"
                        stroke="#3b82f6"
                        strokeWidth={2.4}
                        dot={false}
                        activeDot={{
                          r: 5,
                          strokeWidth: 0,
                          fill: "#3b82f6",
                        }}
                        fill="url(#enviadosGradient)"
                      />
                      <Line
                        type="monotone"
                        dataKey="pagos"
                        name="SADTs pagos"
                        stroke="#22c55e"
                        strokeWidth={2.4}
                        dot={false}
                        activeDot={{
                          r: 5,
                          strokeWidth: 0,
                          fill: "#22c55e",
                        }}
                        fill="url(#pagosGradient)"
                      />
                      <Line
                        type="monotone"
                        dataKey="retornoGlosa"
                        name="Retorno por glosa (R$ mil)"
                        stroke="#8b5cf6"
                        strokeWidth={2.4}
                        dot={false}
                        activeDot={{
                          r: 5,
                          strokeWidth: 0,
                          fill: "#8b5cf6",
                        }}
                        fill="url(#glosaGradient)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Atividades recentes */}
              <Card className="rounded-3xl border-none bg-white/80 shadow-sm ring-1 ring-slate-100/80 dark:bg-slate-900/90 dark:ring-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Atividades</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Últimos eventos relacionados às suas SADTs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-3 rounded-2xl bg-slate-50/70 p-3 text-xs ring-1 ring-slate-100/80 dark:bg-slate-800/60 dark:ring-slate-700"
                    >
                      <div
                        className={`mt-1 flex h-7 w-7 items-center justify-center rounded-xl text-[10px] font-semibold ${activity.color}`}
                      >
                        {activity.tipo}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <p className="text-[13px] font-medium text-slate-900 dark:text-slate-50">
                          {activity.descricao}
                        </p>
                        <span className="text-[11px] text-slate-400">
                          {activity.tempo}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            {/* Tabela de SADTs recentes */}
            <section className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100/80 dark:bg-slate-900/90 dark:ring-slate-800">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    SADTs recentes
                  </h2>
                  <p className="text-xs text-slate-400">
                    Acompanhe os últimos envios e seus status.
                  </p>
                </div>
                <button className="hidden rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 sm:inline-flex">
                  Ver todas
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl bg-white/80 ring-1 ring-slate-100/80 dark:bg-slate-900/80 dark:ring-slate-800">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-100 text-xs text-slate-400 dark:border-slate-800">
                      <TableHead className="px-4 py-3">Protocolo</TableHead>
                      <TableHead className="px-4 py-3">Data</TableHead>
                      <TableHead className="px-4 py-3">Paciente</TableHead>
                      <TableHead className="px-4 py-3 text-right">
                        Valor
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSadt.map((item) => (
                      <TableRow
                        key={item.protocolo}
                        className="border-b border-slate-50/80 text-xs hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <TableCell className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                          {item.protocolo}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-slate-500 dark:text-slate-300">
                          {item.data}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-slate-500 dark:text-slate-300">
                          {item.paciente}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-50">
                          {item.valor}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[11px] font-semibold ${item.statusColor}`}
                          >
                            {item.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;