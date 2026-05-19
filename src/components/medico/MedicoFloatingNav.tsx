import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, LayoutDashboard, Plus, X, FileText, Activity, Wallet } from "lucide-react";
import { toast } from "sonner";

/**
 * Menu flutuante (mobile-first) para o dashboard do médico.
 *
 * Estrutura:
 *  [Início]   [+ centralizado]   [Admin]
 *
 * Ao tocar no "+" abre um menu radial com:
 *  - Faturamento     -> /medico/faturamentos/enviar
 *  - Acompanhamento  -> /medico/acompanhamento/enviar
 *  - Recebimentos    -> em construção
 */
const MedicoFloatingNav: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleRecebimentos = () => {
    setOpen(false);
    toast.info("Recebimentos: módulo em construção.");
  };

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {/* Backdrop quando o menu está aberto */}
      {open && (
        <div
          className="pointer-events-auto fixed inset-0 -z-10 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="pointer-events-auto relative mb-3 w-full max-w-sm px-4">
        {/* Pop-up de opções */}
        {open && (
          <div className="absolute inset-x-0 bottom-full mb-3 flex flex-col gap-2 px-2">
            <button
              type="button"
              onClick={() => goTo("/medico/faturamentos/enviar")}
              className="flex items-center gap-3 rounded-2xl border border-[#D4A017]/30 bg-[#0f0f0f]/95 px-4 py-3 text-left text-sm font-medium text-[#F5F5F5] shadow-[0_18px_55px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-colors hover:border-[#D4A017]/60 hover:bg-[#1a1a1a]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_18px_rgba(212,160,23,0.35)]">
                <FileText className="h-5 w-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Faturamento</span>
                <span className="text-[11px] text-[#9CA3AF]">Enviar documentos do faturamento</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => goTo("/medico/acompanhamento/enviar")}
              className="flex items-center gap-3 rounded-2xl border border-[#D4A017]/30 bg-[#0f0f0f]/95 px-4 py-3 text-left text-sm font-medium text-[#F5F5F5] shadow-[0_18px_55px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-colors hover:border-[#D4A017]/60 hover:bg-[#1a1a1a]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D4A017]/15 text-[#D4A017] border border-[#D4A017]/30">
                <Activity className="h-5 w-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Acompanhamento</span>
                <span className="text-[11px] text-[#9CA3AF]">Enviar SADT de acompanhamento</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleRecebimentos}
              className="flex items-center gap-3 rounded-2xl border border-[#D4A017]/15 bg-[#0f0f0f]/95 px-4 py-3 text-left text-sm font-medium text-[#9CA3AF] shadow-[0_18px_55px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-colors hover:border-[#D4A017]/30"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D4A017]/8 text-[#D4A017]/70 border border-[#D4A017]/15">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#F5F5F5]">Recebimentos</span>
                <span className="text-[11px] text-[#9CA3AF]">Em construção</span>
              </div>
            </button>
          </div>
        )}

        {/* Barra principal */}
        <div className="relative flex items-end justify-between rounded-3xl border border-[#D4A017]/20 bg-[#0f0f0f]/95 px-6 py-3 shadow-[0_18px_55px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => goTo("/medico/dashboard")}
            className="flex flex-col items-center gap-1 text-[#F5F5F5] transition-colors hover:text-[#D4A017]"
          >
            <Home className="h-5 w-5" />
            <span className="text-[11px] font-semibold tracking-wide">Início</span>
          </button>

          {/* Espaço para o botão central flutuante */}
          <div className="w-16" aria-hidden />

          <button
            type="button"
            onClick={() => goTo("/admin/dashboard")}
            className="flex flex-col items-center gap-1 text-[#F5F5F5] transition-colors hover:text-[#D4A017]"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[11px] font-semibold tracking-wide">Admin</span>
          </button>

          {/* Botão central flutuante (+) */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black shadow-[0_0_30px_rgba(212,160,23,0.5)] ring-4 ring-[#0b0b0b] transition-transform duration-300 ${
              open ? "rotate-45" : "rotate-0"
            }`}
          >
            {open ? <X className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicoFloatingNav;
