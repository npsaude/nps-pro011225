import React from "react";
import { FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFaturamentoFlow } from "../context/flow-context";

/**
 * Tela "Gerar guia de honorários?": oferece o preenchimento automático do
 * modelo da instituição ou pular a etapa. Consome o contexto de fluxo.
 */
export const HonorariosQuestionStep: React.FC = () => {
  const { onGerarGuiaHonorarios, onContinuarSemGuiaHonorarios } = useFaturamentoFlow();

  return (
    <div className="mt-2 flex w-full max-w-md flex-col">
      <div className="rounded-3xl border border-[#D4A017]/20 bg-black/40 p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4A017]/15 text-[#FFD700]">
            <FileCheck className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#F5F5F5]">Gerar guia de honorários?</h2>
            <p className="text-xs text-[#9CA3AF]">
              Podemos preencher automaticamente o modelo da instituição de faturamento.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-shadow hover:shadow-[0_0_30px_rgba(212,160,23,0.6)]"
            onClick={onGerarGuiaHonorarios}
          >
            Gerar guia automaticamente
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
            onClick={() => void onContinuarSemGuiaHonorarios()}
          >
            Pular esta etapa
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HonorariosQuestionStep;
