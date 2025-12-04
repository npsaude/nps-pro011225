import { useNavigate } from "react-router-dom";
import { ArrowRightCircle, Lock } from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen w-full bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Fundo com gradiente suave */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#e5f0ff] via-[#f8fbff] to-[#e3eeff] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      <div className="flex h-full w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#135bec] shadow-md shadow-blue-500/40">
              <img
                src="/logo.jpeg"
                alt="Logo NP Saúde Pró"
                className="h-8 w-8 rounded-xl object-cover"
              />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-50 sm:text-base">
                NP Saúde Pró
              </h2>
              <p className="text-xs text-slate-400">
                Portal de envio de GHI e área administrativa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-sm ring-1 ring-slate-200/80 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
              <span className="sr-only">Ajuda</span>
              <span>?</span>
            </button>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="flex flex-1 items-center justify-center">
          <div className="grid w-full max-w-3xl gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
            {/* Card principal */}
            <div className="flex flex-col justify-between rounded-3xl bg-white/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)] ring-1 ring-slate-100/80 backdrop-blur-xl dark:bg-slate-900/90 dark:ring-slate-800 sm:p-7">
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Fluxo rápido de envio de GHI
                </p>
                <h1 className="text-2xl font-semibold leading-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                  Envie suas GHIs de forma simples e organizada.
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Informe os dados do paciente, anexe os documentos necessários
                  e acompanhe o status em tempo real na área administrativa.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  className="flex h-11 flex-1 items-center justify-center gap-2.5 rounded-full bg-[#135bec] px-5 text-sm font-semibold text-white shadow-md shadow-blue-500/40 transition-transform hover:translate-y-0.5 sm:text-base"
                  onClick={() => navigate("/sadt/enviar")}
                >
                  <ArrowRightCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Enviar GHI</span>
                </button>
                <button
                  className="flex h-11 flex-1 items-center justify-center gap-2.5 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition-transform hover:translate-y-0.5 dark:bg-slate-100 dark:text-slate-900 sm:text-base"
                  onClick={() => navigate("/login")}
                >
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Área Administrativa</span>
                </button>
              </div>

              <p className="mt-3 text-[11px] text-slate-400 sm:text-xs">
                Ao continuar, você concorda com os termos de uso e política de
                privacidade da NP Saúde Pró.
              </p>
            </div>

            {/* Card secundário / informação rápida */}
            <div className="flex flex-col justify-between rounded-3xl bg-[#135bec] px-6 py-6 text-white shadow-[0_18px_60px_rgba(37,99,235,0.55)] sm:px-7">
              <div className="space-y-2">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
                  NOVO
                </p>
                <h2 className="text-lg font-semibold leading-tight">
                  Acompanhe o status das GHIs
                </h2>
                <p className="text-xs text-sky-100 sm:text-sm">
                  visualize rapidamente quais GHIs estão em análise, pagas ou
                  com glosa no painel administrativo.
                </p>
              </div>
              <div className="mt-5 space-y-2 text-xs text-sky-100/90 sm:text-sm">
                <p>• Histórico completo de solicitações.</p>
                <p>• Indicadores de desempenho e faturamento.</p>
                <p>• Alertas para glosas e pendências.</p>
              </div>
            </div>
          </div>
        </main>

        {/* Rodapé */}
        <footer className="mt-6 flex w-full flex-col items-center gap-3 pb-3 text-center text-[11px] text-slate-400 sm:text-xs">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <button className="transition-colors hover:text-[#135bec]">
              Suporte
            </button>
            <button className="transition-colors hover:text-[#135bec]">
              Termos de Uso
            </button>
          </div>
          <p>
            © {new Date().getFullYear()} NP Saúde Pró. Todos os direitos
            reservados.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;