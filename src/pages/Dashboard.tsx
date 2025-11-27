import {
  LayoutDashboard,
  FileText,
  BarChart3,
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

const topMetrics = [
  {
    title: "Total de SADTs",
    value: "1.204",
    change: "+2,5% vs mês anterior",
    changeColor: "text-emerald-500",
  },
  {
    title: "Aguardando Aprovação",
    value: "82",
    change: "+5,1% vs mês anterior",
    changeColor: "text-emerald-500",
  },
  {
    title: "Enviadas",
    value: "978",
    change: "+1,8% vs mês anterior",
    changeColor: "text-emerald-500",
  },
  {
    title: "Pagas",
    value: "834",
    change: "-0,5% vs mês anterior",
    changeColor: "text-red-500",
  },
];

const bottomMetrics = [
  {
    title: "Em Glosa",
    value: "144",
    change: "+1,2% vs mês anterior",
    changeColor: "text-red-500",
  },
  {
    title: "Valor recuperado de Glosa",
    value: "R$ 12.345,67",
    change: "+3,4% vs mês anterior",
    changeColor: "text-emerald-500",
  },
  {
    title: "% de Glosa em relação ao Faturamento",
    value: "5,7%",
    change: "-0,8% vs mês anterior",
    changeColor: "text-emerald-500",
  },
];

const monthlyData = [
  {
    mes: "Jan",
    total: 65,
    enviadas: 28,
    pagas: 18,
    aguardandoPagamento: 10,
  },
  {
    mes: "Fev",
    total: 59,
    enviadas: 48,
    pagas: 38,
    aguardandoPagamento: 10,
  },
  {
    mes: "Mar",
    total: 80,
    enviadas: 40,
    pagas: 30,
    aguardandoPagamento: 10,
  },
  {
    mes: "Abr",
    total: 81,
    enviadas: 19,
    pagas: 12,
    aguardandoPagamento: 7,
  },
  {
    mes: "Mai",
    total: 56,
    enviadas: 86,
    pagas: 76,
    aguardandoPagamento: 10,
  },
  {
    mes: "Jun",
    total: 55,
    enviadas: 27,
    pagas: 17,
    aguardandoPagamento: 10,
  },
  {
    mes: "Jul",
    total: 40,
    enviadas: 90,
    pagas: 80,
    aguardandoPagamento: 10,
  },
  {
    mes: "Ago",
    total: 62,
    enviadas: 50,
    pagas: 40,
    aguardandoPagamento: 10,
  },
  {
    mes: "Set",
    total: 75,
    enviadas: 65,
    pagas: 55,
    aguardandoPagamento: 10,
  },
  {
    mes: "Out",
    total: 88,
    enviadas: 70,
    pagas: 60,
    aguardandoPagamento: 10,
  },
  {
    mes: "Nov",
    total: 92,
    enviadas: 78,
    pagas: 68,
    aguardandoPagamento: 10,
  },
  {
    mes: "Dez",
    total: 101,
    enviadas: 85,
    pagas: 75,
    aguardandoPagamento: 10,
  },
];

const Dashboard = () => {
  return (
    <div className="relative flex min-h-screen w-full bg-background text-foreground transition-colors">
      {/* Fundo sutil em degradê */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-[#135bec]/18 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-500/14 blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="hidden h-screen min-h-[700px] w-64 flex-col justify-between border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground backdrop-blur-xl md:flex">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3 px-2">
            <img
              src="/logo.jpeg"
              alt="Logo NP Saúde Pró"
              className="h-9 w-9 rounded-full object-cover"
            />
            <h1 className="text-lg font-bold">NP Saúde Pró</h1>
          </div>

          <nav className="flex flex-col gap-1">
            <button className="flex items-center gap-3 rounded-lg bg-sidebar-primary/15 px-3 py-2.5 text-sm font-semibold text-sidebar-primary">
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <FileText className="h-5 w-5" />
              <span>Solicitações</span>
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <BarChart3 className="h-5 w-5" />
              <span>Relatórios</span>
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Settings className="h-5 w-5" />
              <span>Configurações</span>
            </button>
          </nav>
        </div>

        <div className="flex flex-col gap-1">
          <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <HelpCircle className="h-5 w-5" />
            <span>Ajuda</span>
          </button>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-8 lg:px-10">
          <h2 className="text-2xl font-bold">Dashboard</h2>

          <div className="flex items-center gap-4">
            {/* Campo de busca */}
            <div className="hidden items-center rounded-lg bg-muted px-3 py-2 text-sm text-foreground ring-1 ring-border backdrop-blur sm:flex">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar"
                className="h-6 w-40 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none sm:w-56"
              />
            </div>

            <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border transition-colors hover:bg-muted/80">
              <Bell className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <img
                src="/perfil.jpeg"
                alt="Foto do usuário"
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="hidden flex-col text-right text-xs sm:flex">
                <span className="text-sm font-semibold">Jurandy Pessoa</span>
                <span className="text-[11px] text-muted-foreground">
                  usuario@saudepro.com
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:px-10">
          {/* Cards principais */}
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {topMetrics.map((metric) => (
              <div
                key={metric.title}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {metric.value}
                </p>
                <p className={`text-sm font-medium ${metric.changeColor}`}>
                  {metric.change}
                </p>
              </div>
            ))}
          </section>

          {/* Cards complementares */}
          <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {bottomMetrics.map((metric) => (
              <div
                key={metric.title}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {metric.value}
                </p>
                <p className={`text-sm font-medium ${metric.changeColor}`}>
                  {metric.change}
                </p>
              </div>
            ))}
          </section>

          {/* Gráfico de linha */}
          <section className="mt-10 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-bold">Análise Mensal de SADTs</h3>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">
                    Quantidade de SADTs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Enviadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground">Pagas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-muted-foreground">
                    Aguardando Pagamento
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyData}
                  margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    stroke="rgba(148, 163, 184, 0.2)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="mes"
                    stroke="rgba(148, 163, 184, 0.9)"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(148, 163, 184, 0.9)"
                    tickLine={false}
                    width={40}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      borderRadius: 8,
                      border: "1px solid rgba(148,163,184,0.3)",
                      color: "#e5e7eb",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Quantidade de SADTs"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="enviadas"
                    name="Enviadas"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pagas"
                    name="Pagas"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="aguardandoPagamento"
                    name="Aguardando Pagamento"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;