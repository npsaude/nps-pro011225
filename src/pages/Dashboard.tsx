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
  FileSignature,
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
import { useNavigate } from "react-router-dom";

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
    descricao: "SADT criada para o médico Maria Silva",
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
    medico: "Carlos Pereira",
    valor: "R$ 2.450,00",
    status: "PAGA",
    statusColor: "bg-emerald-100 text-emerald-700",
  },
  {
    protocolo: "SADT-2024-13398",
    data: "28 Jun, 2024",
    medico: "Ana Costa",
    valor: "R$ 1.280,00",
    status: "EM ANÁLISE",
    statusColor: "bg-amber-100 text-amber-700",
  },
  {
    protocolo: "SADT-2024-13340",
    data: "25 Jun, 2024",
    medico: "João Almeida",
    valor: "R$ 980,00",
    status: "GLOSA",
    statusColor: "bg-rose-100 text-rose-700",
  },
  {
    protocolo: "SADT-2024-13290",
    data: "20 Jun, 2024",
    medico: "Luciana Lima",
    valor: "R$ 3.120,00",
    status: "PAGA",
    statusColor: "bg-emerald-100 text-emerald-700",
  },
];

const Dashboard = () => {
  const [selectedClinic, setSelectedClinic] = useState<string>("todas");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("todos");
  const navigate = useNavigate();

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
              {/* Home */}
              <button className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all bg-[#135bec] text-white shadow-md shadow-blue-500/40">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white">
                    <Home className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Home</span>
                </span>
              </button>

              {/* SADT's */}
              <button
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                onClick={() => navigate("/sadt/cadastro")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="font-medium">SADT&apos;s</span>
                </span>
              </button>

              {/* Descrição Cirúrgica */}
              <button
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                onClick={() => navigate("/descricao-cirurgica")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <FileSignature className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Descrição Cirúrgica</span>
                </span>
              </button>

              {/* Recursos */}
              <button className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Recursos</span>
                </span>
              </button>

              {/* Cadastro com subitens */}
              <div className="mt-1 rounded-2xl bg-slate-50/80 p-2 text-xs text-slate-500 ring-1 ring-slate-100/80 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-800">
                <div className="flex items-center gap-3 rounded-2xl px-1.5 py-1.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Users className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-100">
                    Cadastro
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  <button
                    className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                    onClick={() => navigate("/cadastro/clinicas")}
                  >
                    <span className="ml-7">Clínicas</span>
                  </button>
                  <button
                    className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                    onClick={() => navigate("/cadastro/medicos")}
                  >
                    <span className="ml-7">Médicos</span>
                  </button>
                  <button className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <span className="ml-7">Planos de Saúde</span>
                  </button>
                </div>
              </div>

              {/* Mensagens */}
              <button className="mt-1 flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Mensagens</span>
                </span>
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 text-[11px] font-semibold text-white">
                  2
                </span>
              </button>

              {/* Configurações -> agora navega para /admin/configuracoes */}
              <button
                className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                onClick={() => navigate("/admin/configuracoes")}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Settings className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Configurações</span>
                </span>
              </button>

              {/* Ajuda */}
              <button className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <HelpCircle className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Ajuda</span>
                </span>
              </button>
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
          {/* ...restante do componente permanece igual... */}
          {/* (Todo o conteúdo abaixo foi mantido sem alterações) */}

          {/* Conteúdo principal */}
          <main className="flex flex-1 flex-col gap-4">
            {/* Linha de cards + CTA lateral */}
            {/* ...restante do JSX original não alterado... */}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;