import { useState } from "react";
import {
  Bell,
  CalendarDays,
  DollarSign,
  Percent,
  Search,
  TrendingDown,
  TrendingUp,
  Activity,
} from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const AdminFinancas = () => {
  const [period, setPeriod] = useState<
    "mensal" | "trimestral" | "semestral" | "anual"
  >("mensal");

  const periodOptions: { id: typeof period; label: string }[] = [
    { id: "mensal", label: "Mensal" },
    { id: "trimestral", label: "Trimestral" },
    { id: "semestral", label: "Semestral" },
    { id: "anual", label: "Anual" },
  ];

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="financas" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.12)] lg:backdrop-blur-xl dark:bg-slate-900/90">
          {/* Header */}
          <header className="flex flex-col gap-4 border-b border-slate-100 pb-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">
                Finanças
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                Acompanhamento detalhado de receitas, comissões e impostos.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex items-center rounded-full bg-[#F5F7F9] px-3 py-1 text-sm text-slate-600 ring-1 ring-[#D9DEE3] focus-within:ring-[#1D4E77] dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                <Search className="mr-2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar"
                  className="h-7 w-40 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-50 sm:w-52 sm:text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <AdminHeaderActions notificationsCount={0} />

                <div className="flex rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                  {periodOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPeriod(opt.id)}
                      className={`rounded-full px-3 py-1.5 transition-all ${
                        period === opt.id
                          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50"
                          : "hover:bg-white/70 dark:hover:bg-slate-700/70"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 space-y-4">
            {/* Card: Painel Financeiro */}
            <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50 shadow-md dark:bg-slate-800">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Painel Financeiro
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      Gestão Executiva de Receitas
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="hidden rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700 sm:inline-flex dark:bg-emerald-900/30 dark:text-emerald-300">
                    +8,2% vs. último período
                  </span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            {/* Cards principais: Comissão / Impostos / Receita Líquida */}
            <section className="grid gap-4 lg:grid-cols-[2fr_2fr_3fr]">
              {/* Comissão Bruta */}
              <Card className="rounded-3xl border-0 bg-gradient-to-br from-sky-500/10 via-sky-400/5 to-sky-500/10 text-slate-900 shadow-sm dark:from-sky-500/10 dark:via-slate-900 dark:to-slate-900">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20">
                      <Percent className="h-4 w-4" />
                    </span>
                    Comissão Bruta
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">
                    Base: 3,5% Fat. + 6% Recup.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4 pt-1">
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    R$ 27.500,00
                  </p>
                </CardContent>
              </Card>

              {/* Impostos */}
              <Card className="rounded-3xl border-0 bg-gradient-to-br from-rose-500/10 via-rose-400/5 to-rose-500/10 text-slate-900 shadow-sm dark:from-rose-500/15 dark:via-slate-900 dark:to-slate-900">
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-400">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20">
                      <TrendingDown className="h-4 w-4" />
                    </span>
                    Impostos (6%)
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dedução sobre comissão
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4 pt-1">
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                    R$ 1.650,00
                  </p>
                </CardContent>
              </Card>

              {/* Receita Líquida */}
              <Card className="rounded-3xl border-0 bg-[#020617] text-slate-50 shadow-[0_18px_40px_rgba(15,23,42,0.65)] dark:bg-slate-950">
                <CardContent className="flex h-full flex-col justify-between gap-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
                        Receita Líquida
                      </span>
                      <p className="text-3xl font-semibold">R$ 25.850,00</p>
                      <p className="text-[11px] text-slate-300">
                        Resultado final do período
                      </p>
                    </div>
                    <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 sm:flex">
                      <Activity className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Meta do período</span>
                      <span className="font-semibold text-emerald-300">
                        92% atingido
                      </span>
                    </div>
                    <Progress value={92} className="h-1.5 bg-slate-800" />
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Métricas operacionais + Demonstrativo */}
            <section className="grid gap-4 lg:grid-cols-[3fr_2.5fr]">
              {/* Métricas operacionais */}
              <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      $
                    </span>
                    Métricas Operacionais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                  {/* Total Faturado */}
                  <div className="flex items-start justify-between rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                        F
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          Total Faturado
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Valor bruto enviado aos convênios
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        R$ 700.000,00
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                        Entrada
                      </span>
                    </div>
                  </div>

                  {/* Total Recebido */}
                  <div className="flex items-start justify-between rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        R
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                          Total Recebido
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Valor efetivamente creditado
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        R$ 640.000,00
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        Confirmado
                      </span>
                    </div>
                  </div>

                  {/* Glosa / Recuperado */}
                  <div className="grid gap-3 md:grid-cols-2">
                    {/* Glosa Inicial */}
                    <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-500 dark:text-rose-400">
                            Glosa Inicial
                          </span>
                          <span className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-50">
                            R$ 60.000,00
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={100}
                        className="h-2 bg-rose-100 dark:bg-rose-950/50"
                      />
                    </div>

                    {/* Recuperado */}
                    <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                            Recuperado
                          </span>
                          <span className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-50">
                            R$ 50.000,00
                          </span>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          84% Eficiência
                        </span>
                      </div>
                      <Progress
                        value={84}
                        className="h-2 bg-emerald-50 dark:bg-emerald-950/40"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Demonstrativo de Resultado */}
              <Card className="rounded-3xl border border-[#E2E8F0] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-2">
                      <span className="text-base">＄</span>
                      Demonstrativo de Resultado
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                  {/* Resultado do período - header escuro */}
                  <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-slate-50 dark:bg-slate-950">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                        Resultado do Período
                      </span>
                      <span className="text-2xl font-semibold">
                        R$ 25.850,00
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Líquido Disponível
                      </span>
                    </div>
                    <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                      <CalendarDays className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Linhas do demonstrativo */}
                  <div className="overflow-hidden rounded-2xl bg-slate-50 text-xs text-slate-600 ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                    {/* Comissão */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                          +
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                            Comissão
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Receita Bruta
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        R$ 27.500,00
                      </span>
                    </div>

                    {/* Impostos */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-xs dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                          -
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                            Impostos
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Tributação (6%)
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                        (R$ 1.650,00)
                      </span>
                    </div>

                    {/* Líquido */}
                    <div className="flex items-center justify-between bg-emerald-50 px-5 py-3 text-xs text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white dark:bg-emerald-500">
                          +
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            Líquido
                          </span>
                          <span className="text-[11px]">
                            Valor Final do período
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">
                        R$ 25.850,00
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                    <span>
                      Baseado em dados consolidados do período{" "}
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {period === "mensal"
                          ? "mensal"
                          : period === "trimestral"
                          ? "trimestral"
                          : period === "semestral"
                          ? "semestral"
                          : "anual"}
                      </span>
                      .
                    </span>
                    <span className="hidden items-center gap-1 sm:flex">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      <span>Eficiência de 84% na recuperação de glosas</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminFinancas;