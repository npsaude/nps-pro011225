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
  BarChart,
  Bar,
  XAxis,
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

const sidebarItems = [
  { label: "Home", icon: Home, active: true },
  { label: "SADTs", icon: FileText, active: false },
  { label: "Pacientes", icon: Users, active: false },
  { label: "Procedimentos", icon: Stethoscope, active: false },
  { label: "Mensagens", icon: MessageCircle, active: false, badge: 2 },
  { label: "Configurações", icon: Settings, active: false },
  { label: "Ajuda", icon: HelpCircle, active: false },
];

const topMetrics = [
  {
    title: "Receita Total",
    value: "R$ 216k",
    tag: "+3,4%",
    tagColor: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "SADTs enviadas",
    value: "2.221",
    tag: "+4,1%",
    tagColor: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Pacientes",
    value: "1.423",
    tag: "+2,3%",
    tagColor: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Índice de Glosa",
    value: "5,7%",
    tag: "-0,8%",
    tagColor: "bg-rose-100 text-rose-700",
  },
];

const monthlyRevenueData = [
  { mes: "Jan", valor: 8000 },
  { mes: "Fev", valor: 9500 },
  { mes: "Mar", valor: 12000 },
  { mes: "Abr", valor: 11000 },
  { mes: "Mai", valor: 13000 },
  { mes: "Jun", valor: 15000 },
  { mes: "Jul", valor: 14000 },
  { mes: "Ago", valor: 14500 },
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

          {/* Conteúdo principal */}
          <main className="flex flex-1 flex-col gap-4">
            {/* Linha de cards + CTA lateral */}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
              {/* Cards de métricas */}
              <div className="grid gap-3 rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100/80 dark:bg-slate-900/90 dark:ring-slate-800 sm:grid-cols-2 xl:grid-cols-4">
                {topMetrics.map((metric) => (
                  <Card
                    key={metric.title}
                    className="border-none bg-transparent shadow-none"
                  >
                    <CardHeader className="space-y-1 p-0">
                      <CardDescription className="text-xs text-slate-400">
                        {metric.title}
                      </CardDescription>
                      <div className="flex items-baseline gap-2">
                        <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                          {metric.value}
                        </CardTitle>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${metric.tagColor}`}
                        >
                          {metric.tag}
                        </span>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
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

            {/* Gráfico de receita mensal */}
            <section className="grid gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
              <Card className="rounded-3xl border-none bg-white/80 shadow-sm ring-1 ring-slate-100/80 dark:bg-slate-900/90 dark:ring-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardDescription className="text-xs text-slate-400">
                      Receita mensal
                    </CardDescription>
                    <CardTitle className="text-xl text-slate-900 dark:text-slate-50">
                      R$ 15.000,00
                    </CardTitle>
                  </div>
                  <Badge className="rounded-full bg-slate-900/90 px-3 py-1 text-[11px] font-medium text-white shadow-md dark:bg-slate-100 dark:text-slate-900">
                    Junho
                  </Badge>
                </CardHeader>
                <CardContent className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenueData} barSize={26}>
                      <CartesianGrid
                        vertical={false}
                        stroke="rgba(148, 163, 184, 0.3)"
                      />
                      <XAxis
                        dataKey="mes"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                        contentStyle={{
                          backgroundColor: "white",
                          borderRadius: 12,
                          border: "1px solid rgba(148,163,184,0.3)",
                          padding: "8px 10px",
                          fontSize: 12,
                        }}
                        formatter={(value: unknown) =>
                          `R$ ${(value as number).toLocaleString("pt-BR")}`
                        }
                      />
                      <Bar
                        dataKey="valor"
                        radius={[10, 10, 10, 10]}
                        fill="#dbeafe"
                        activeBar={
                          <rect
                            rx={10}
                            ry={10}
                            stroke="#1d4ed8"
                            strokeWidth={0}
                            fill="#2563eb"
                          />
                        }
                      />
                    </BarChart>
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