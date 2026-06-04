import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFaturamentoFlow } from "../context/flow-context";

/**
 * Tela exibida quando não há modelo de guia de honorários configurado para a
 * instituição selecionada. Permite voltar ou continuar sem a guia.
 * Consome o contexto de fluxo.
 */
export const NoModelStep: React.FC = () => {
  const { goTo, onContinuarSemGuiaHonorarios } = useFaturamentoFlow();

  return (
    <div className="mt-2 flex w-full max-w-md flex-col items-center">
      <div className="w-full rounded-3xl border border-[#D4A017]/20 bg-black/40 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-[#D4A017]" />
        <h2 className="mt-4 text-lg font-semibold text-[#F5F5F5]">
          Modelo de guia não encontrado
        </h2>
        <p className="mt-2 text-sm text-[#9CA3AF]">
          Não existe um modelo configurado para a instituição selecionada.
        </p>
        <div className="mt-6 space-y-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
            onClick={() => goTo("pergunta_honorarios")}
          >
            Voltar
          </Button>
          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black"
            onClick={() => void onContinuarSemGuiaHonorarios()}
          >
            Continuar sem guia
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NoModelStep;
