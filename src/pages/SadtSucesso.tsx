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

  const protocolo =
    state.protocolo ?? "SADT-2024-12345"; // fallback para recarregamentos

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[#101622] px-4 py-6 text-white">
      {/* Gradientes de fundo */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-[#135bec]/20 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/20 blur-[100px]" />
      </div>

      {/* Card principal */}
      <div className="relative flex w-full max-w-lg flex-col items-center rounded-xl bg-black/40 px-6 py-10 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:px-10 sm:py-12">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
          <Check className="h-10 w-10 text-white" />
        </div>

        <h1 className="px-4 pb-3 pt-6 text-center text-[32px] font-bold leading-tight tracking-tight text-white">
          SADT Enviada com Sucesso!
        </h1>

        <p className="px-4 pb-3 pt-1 text-center text-base font-normal leading-normal text-slate-300">
          Sua SADT está aguardando aprovação.
        </p>

        {/* Protocolo */}
        <div className="mt-6 mb-8 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-center">
          <h2 className="text-sm font-medium text-slate-400">
            Número do Protocolo:
          </h2>
          <p className="mt-1 text-lg font-semibold tracking-wider text-slate-100">
            {protocolo}
          </p>
        </div>

        {/* Botões */}
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button
            className="h-12 w-full rounded-lg bg-[#135bec] text-base font-bold tracking-[0.015em] text-white hover:bg-[#135bec]/90"
            onClick={() => navigate("/sadt/enviar")}
          >
            Enviar outra SADT
          </Button>
          <Button
            variant="ghost"
            className="h-12 w-full rounded-lg bg-slate-800 text-base font-bold tracking-[0.015em] text-slate-100 hover:bg-slate-700"
            onClick={() => navigate("/")}
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SadtSucesso;