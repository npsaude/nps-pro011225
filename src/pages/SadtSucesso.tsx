import { useLocation, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationState {
  protocolo?: string;
}

const SadtSucesso = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const protocolo = state.protocolo ?? "SADT-2024-12345";

  return (
    <div className="relative flex min-h-screen w-full bg-[#f4f7ff] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Fundo gradiente */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#e5f0ff] via-[#f8fbff] to-[#e3eeff] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />

      <div className="flex min-h-screen w-full flex-col items-center px-4 py-6 sm:px-6 lg:px-8">
        {/* Logo / topo simples */}
        <header className="mb-6 flex w-full max-w-xl items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-2 text-xs shadow-sm ring-1 ring-slate-100/80 backdrop-blur dark:bg-slate-900/80 dark:ring-slate-800 sm:text-sm"
            onClick={() => navigate("/")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#135bec] shadow-md shadow-blue-500/40">
              <img
                src="/logo.jpeg"
                alt="Logo NP Saúde Pró"
                className="h-7 w-7 rounded-lg object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                NP Saúde Pró
              </span>
              <span className="text-[11px] text-slate-400">
                Envio de SADT concluído
              </span>
            </div>
          </button>
        </header>

        {/* Card principal */}
        <main className="flex flex-1 items-center justify-center w-full">
          <div className="flex w-full max-w-xl flex-col items-center rounded-3xl bg-white/90 px-6 py-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.12)] ring-1 ring-slate-100/80 backdrop-blur-xl dark:bg-slate-900/90 dark:ring-slate-800 sm:px-8 sm:py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/40">
              <Check className="h-9 w-9 text-white" />
            </div>

            <h1 className="mt-5 text-xl font-semibold leading-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              SADT enviada com sucesso!
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              Sua solicitação foi recebida e está aguardando aprovação. Você
              pode acompanhar o status na área administrativa.
            </p>

            {/* Protocolo */}
            <div className="mt-6 w-full max-w-sm rounded-2xl bg-slate-50 px-4 py-3 text-left ring-1 ring-slate-100/80 dark:bg-slate-900/80 dark:ring-slate-800">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Número do protocolo
              </p>
              <p className="mt-1 text-sm font-semibold tracking-[0.16em] text-slate-900 dark:text-slate-50">
                {protocolo}
              </p>
              <p className="mt-2 text-[11px] text-slate-400">
                Guarde este número para consultar o andamento da sua SADT.
              </p>
            </div>

            {/* Botões */}
            <div className="mt-7 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
              <Button
                className="h-10 flex-1 rounded-full bg-[#135bec] text-xs font-semibold text-white shadow-md shadow-blue-500/40 hover:bg-[#135bec]/90 sm:text-sm"
                onClick={() => navigate("/sadt/enviar")}
              >
                Enviar outra SADT
              </Button>
              <Button
                variant="ghost"
                className="h-10 flex-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
                onClick={() => navigate("/")}
              >
                Voltar ao início
              </Button>
            </div>

            <p className="mt-4 text-[11px] text-slate-400">
              Em caso de dúvidas, entre em contato com o suporte da NP Saúde
              Pró.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SadtSucesso;