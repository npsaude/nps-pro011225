import React from "react";
import { Loader2 } from "lucide-react";

/**
 * Tela de carregamento exibida enquanto a guia de honorários é gerada a partir
 * do modelo da instituição. Puramente apresentacional (sem estado).
 */
export const GeneratingHonorariosStep: React.FC = () => (
  <div className="mt-2 flex w-full max-w-md flex-col items-center">
    <div className="w-full rounded-3xl border border-[#D4A017]/20 bg-black/40 p-8 text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#FFD700]" />
      <h2 className="mt-4 text-lg font-semibold text-[#F5F5F5]">
        Gerando guia de honorários
      </h2>
      <p className="mt-2 text-sm text-[#9CA3AF]">
        Estamos preenchendo o modelo da instituição com os dados extraídos do faturamento.
      </p>
    </div>
  </div>
);

export default GeneratingHonorariosStep;
