import {
  Users,
  Stethoscope,
  HelpCircle,
  MessageCircle,
  Bell,
  Search,
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
import { useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";

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

const recentSadt = [
  {
    protocolo: "SADT-2024-13451",
    data: "03 Jul, 2024",
    medico: "Carlos Pereira",
    valor: "R$ 2.450,00",
    status: "PAGA",
    statusColor:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  {
    protocolo: "SADT-2024-13398",
    data: "28 Jun, 2024",
    medico: "Ana Costa",
    valor: "R$ 1.280,00",
    status: "EM ANÁLISE",
    statusColor:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  {
    protocolo: "SADT-2024-13340",
    data: "25 Jun, 2024",
    medico: "João Almeida",
    valor: "R$ 980,00",
    status: "GLOSA",
    statusColor:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  },
];

const Dashboard = () => {
  const [selectedClinic, setSelectedClinic] = useState<string>("todas");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("todos");

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
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E6EEF7] text-slate-600 shadow-sm ring-1 ring-[#D9DEE3]/70 transition-colors hover:bg-[#D9DEE3] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Filtros */}
          <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <Card className="border-[#D9DEE3] bg-white/95 dark:border-slate-800 dark:bg-slate-900/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-200">
                  Clínica
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-400">
                  Filtrar indicadores por unidade
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Select
                  value={selectedClinic}
                  onValueChange={setSelectedClinic}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
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

            <Card className="border-[#D9DEE3] bg-white/95 dark:border-slate-800 dark:bg-slate-900/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-200">
                  Médico
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-400">
                  Filtrar SADTs por médico
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Select
                  value={selectedDoctor}
                  onValueChange={setSelectedDoctor}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
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

          {/* Métricas + gráfico e tabela simplificada */}
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {topMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card
                  key={metric.title}
                  className="border-[#D9DEE3] bg-white/95 dark:border-slate-800 dark:bg-slate-900/90"
                >
                  <CardContent className="flex items-center justify-between gap-3 p-3 sm:p-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {metric.title}
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        {metric.value}
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        {metric.helper}
                      </p>
                    </div>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${metric.gradient} text-white shadow-md shadow-slate-900/20`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-[#D9DEE3] bg-white/95 dark:border-slate-800 dark:bg-slate-900/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  SADTs enviadas x pagas x retorno de glosa
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Visão consolidada dos últimos 12 meses
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 px-1 pb-4 pt-0 sm:h-72 sm:px-2">
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

            <Card className="border-[#D9DEE3] bg-white/95 dark:border-slate-800 dark:bg-slate-900/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  SADTs recentes
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Últimas SADTs lançadas no sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto pt-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#D9DEE3] text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSadt.map((row) => (
                      <TableRow
                        key={row.protocolo}
                        className="border-b border-slate-50 text-xs hover:bg-[#F5F7F9] dark:border-slate-800 dark:hover:bg-slate-800/60"
                      >
                        <TableCell className="font-medium text-slate-900 dark:text-slate-50">
                          {row.protocolo}
                        </TableCell>
                        <TableCell>{row.data}</TableCell>
                        <TableCell>{row.medico}</TableCell>
                        <TableCell>{row.valor}</TableCell>
                        <TableCell>
                          <Badge
                            className={`${row.statusColor} border-0 px-2 py-0.5 text-[11px] font-semibold`}
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;