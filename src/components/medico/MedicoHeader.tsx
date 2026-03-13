import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MEDICO_LOGO_URL } from "@/constants/medico-brand";

type MedicoHeaderProps = {
  /** Mostra o botão de voltar (mantém o header padronizado no portal médico) */
  showBack?: boolean;
  /** Navega para um caminho ao clicar em voltar (alternativa simples ao onBack) */
  backTo?: string;
  /** Callback para casos em que o botão voltar precisa executar lógica local */
  onBack?: () => void;
  /** Texto do badge de status no canto direito */
  statusLabel?: string;
  /** Callback ao clicar no badge de status */
  onStatusClick?: () => void;
  /** Conteúdo adicional no canto direito (ex: ações) */
  right?: React.ReactNode;
  /** Controla a largura/alinhamento do conteúdo interno (ex: max-w-sm/max-w-md) */
  containerClassName?: string;
};

export default function MedicoHeader({
  showBack,
  backTo,
  onBack,
  statusLabel,
  onStatusClick,
  right,
  containerClassName,
}: MedicoHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    if (backTo) return navigate(backTo);
    navigate(-1);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#D4A017]/20 bg-black/70 backdrop-blur-xl">
      <div
        className={cn(
          "mx-auto flex w-full items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8",
          containerClassName,
        )}
      >
        <div className="flex items-center gap-3">
          {showBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-10 w-10 rounded-xl bg-black/40 text-[#F5F5F5] border border-[#D4A017]/15 hover:bg-[#D4A017]/10 hover:text-[#D4A017]"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] flex items-center justify-center shadow-[0_0_20px_rgba(212,160,23,0.4)]">
              <img
                src={MEDICO_LOGO_URL}
                alt="Logo Conmedic"
                className="h-6 w-6 object-contain"
                loading="eager"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#FFD700] to-[#D4A017] bg-clip-text text-transparent">
              CONMEDIC
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusLabel ? (
            onStatusClick ? (
              <button
                type="button"
                onClick={onStatusClick}
                className="flex items-center gap-2 rounded-full bg-[#D4A017]/10 px-3 py-1.5 text-[11px] text-[#D4A017] border border-[#D4A017]/25 hover:bg-[#D4A017]/20 hover:border-[#D4A017]/50 transition-colors cursor-pointer"
              >
                <span className="h-2 w-2 rounded-full bg-[#D4A017] shadow-[0_0_8px_rgba(212,160,23,0.8)]" />
                <span className="whitespace-nowrap">{statusLabel}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-full bg-[#D4A017]/10 px-3 py-1.5 text-[11px] text-[#D4A017] border border-[#D4A017]/25">
                <span className="h-2 w-2 rounded-full bg-[#D4A017] shadow-[0_0_8px_rgba(212,160,23,0.8)]" />
                <span className="whitespace-nowrap">{statusLabel}</span>
              </div>
            )
          ) : null}
          {right}
        </div>
      </div>
    </header>
  );
}