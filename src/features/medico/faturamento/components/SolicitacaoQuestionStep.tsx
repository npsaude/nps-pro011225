import React from "react";
import { FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFaturamentoFlow } from "../context/flow-context";

/**
 * Tela "Guia de Solicitação" (etapa opcional): pergunta se o médico deseja
 * enviar a guia de solicitação agora. Consome o contexto de fluxo.
 * Extraída da página sem alterar o comportamento.
 */
export const SolicitacaoQuestionStep: React.FC = () => {
  const { goTo, fileInputRefSolicitacao } = useFaturamentoFlow();

  return (
    <div className="mt-2 flex w-full max-w-md flex-col items-center">
      <div className="w-full rounded-2xl bg-black/70 backdrop-blur-xl px-6 py-8 shadow-[0_0_40px_rgba(212,160,23,0.12)] border border-[#D4A017]/20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_30px_rgba(212,160,23,0.35)]">
          <FileCheck className="h-8 w-8" />
        </div>

        <h2 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl mb-2">
          Guia de Solicitação
        </h2>
        <p className="text-xs text-[#9CA3AF] sm:text-sm mb-8">
          Deseja enviar a Guia de Solicitação agora? Esta etapa é opcional.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
            onClick={() => {
              goTo("upload_solicitacao");
              setTimeout(() => fileInputRefSolicitacao.current?.click(), 100);
            }}
          >
            Sim, enviar guia
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
            onClick={() => goTo("pergunta_guia_autorizacao")}
          >
            Não, pular esta etapa
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SolicitacaoQuestionStep;
