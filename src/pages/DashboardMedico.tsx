import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Wallet,
  Activity,
  FileHeart,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

const DashboardMedico = () => {
  const navigate = useNavigate();

  const receitaTotalAno = "R$ 485.200,00";
  const numeroCirurgiasAno = "96";
  const totalAReceber = "R$ 72.500,00";
  const valorGlosa = "R$ 18.300,00";
  const percentualGlosaRecuperado = "68%";

  return (
    <div className="relative flex min-h-screen w-full bg-slate-950 text-slate-50">
      {/* Fundo em gradiente médico */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#1F8A70_0,#020617_55%),radial-gradient(circle_at_100%_100%,#1D4E77_0,#020617_50%)] opacity-95" />

      <div className="flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Topo */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-xs text-emerald-100 shadow-sm ring-1 ring-emerald-500/40 backdrop-blur"
            onClick={() => navigate("/login-medico")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-[11px] text-emerald-100/80 shadow-sm ring-1 ring-emerald-500/30 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Portal do Médico · Online</span>
          </div>
        </header>

        {/* Cabeçalho do dashboard */}
        <section className="mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 shadow-md shadow-emerald-400/40">
              <FileHeart className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold leading-tight text-slate-50 sm:text-xl">
                Visão geral das suas cirurgias
              </h1>
              <p className="text-[11px] text-emerald-100/80 sm:text-xs">
                Acompanhe rapidamente receita, glosas e valores em aberto.
              </p>
            </div>
          </div>
        </section>

        {/* Conteúdo principal */}
        <main className="flex-1">
          {/* CTA principal */}
          <section className="mb-4">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-2xl bg-emerald-500 px-4 py-3 text-left text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 transition-transform hover:translate-y-0.5"
              onClick={() => navigate("/medico/descricao-cirurgica/enviar")}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/70">
                  <Upload className="h-4 w-4" />
                </span>
                <div className="flex flex-col">
                  <span>Enviar Descrição Cirúrgica</span>
                  <span className="text-[11px] font-normal text-emerald-100/90">
                    Envie fotos e arquivos da descrição cirúrgica para análise.
                  </span>
                </div>
              </div>
            </button>
          </section>

          {/* Acompanhamento / menu simples */}
          <section className="mb-5">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-2xl bg-slate-950/80 px-4 py-3 text-left text-xs font-medium text-emerald-100 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-950/70"
              onClick={() => navigate("/medico/descricao-cirurgica")}
            >
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/90">
                  Acompanhamento
                </span>
                <span className="mt-1 text-sm font-semibold">
                  Minhas descrições cirúrgicas
                </span>
                <span className="text-[11px] text-emerald-100/80">
                  Veja os registros estruturados gerados a partir dos documentos
                  enviados.
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-300">
                Abrir
              </span>
            </button>
          </section>

          {/* Cards de indicadores */}
          <section className="space-y-3">
            {/* Linha 1 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl bg-slate-950/70 px-4 py-3 shadow-md ring-1 ring-emerald-500/25">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200/80">
                    Receita total no ano
                  </span>
                  <span className="mt-1 text-lg font-semibold text-emerald-100 sm:text-xl">
                    {receitaTotalAno}
                  </span>
                  <span className="mt-1 text-[11px] text-emerald-100/70">
                    Considerando todos os procedimentos cirúrgicos lançados.
                  </span>
                </div>
                <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-950/70 px-4 py-3 shadow-md ring-1 ring-emerald-500/25">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200/80">
                    Cirurgias no ano
                  </span>
                  <span className="mt-1 text-lg font-semibold text-emerald-100 sm:text-xl">
                    {numeroCirurgiasAno}
                  </span>
                  <span className="mt-1 text-[11px] text-emerald-100/70">
                    Número de cirurgias com documentação enviada.
                  </span>
                </div>
                <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Linha 2 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl bg-slate-950/70 px-4 py-3 shadow-md ring-1 ring-emerald-500/25">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200/80">
                    Total a receber
                  </span>
                  <span className="mt-1 text-lg font-semibold text-emerald-100 sm:text-xl">
                    {totalAReceber}
                  </span>
                  <span className="mt-1 text-[11px] text-emerald-100/70">
                    Valor ainda não pago pelos planos de saúde.
                  </span>
                </div>
                <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                  <FileHeart className="h-5 w-5" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-950/70 px-4 py-3 shadow-md ring-1 ring-rose-500/30">
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-rose-200/80">
                    Valor em glosa
                  </span>
                  <span className="mt-1 text-lg font-semibold text-rose-100 sm:text-xl">
                    {valorGlosa}
                  </span>
                  <span className="mt-1 text-[11px] text-rose-100/80">
                    Montante glosado nas cirurgias do ano.
                  </span>
                </div>
                <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-200">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Linha 3 */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-950/80 px-4 py-3 shadow-md ring-1 ring-emerald-400/40">
              <div className="flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200/80">
                  % de glosa recuperado
                </span>
                <span className="mt-1 text-2xl font-semibold text-emerald-100">
                  {percentualGlosaRecuperado}
                </span>
                <span className="mt-1 text-[11px] text-emerald-100/80">
                  Percentual do valor glosado que já foi revertido em pagamento.
                </span>
              </div>
              <div className="ml-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </section>

          {/* Rodapé explicativo */}
          <section className="mt-4 border-t border-emerald-500/20 pt-3 text-[11px] text-emerald-100/80">
            <p>
              Os valores exibidos são um resumo financeiro das suas cirurgias
              no ano. Em breve, você poderá filtrar por período, convênio e tipo
              de procedimento.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DashboardMedico;