import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Tela final de sucesso do fluxo de faturamento.
 * Extraída da página MedicoUploadDescricaoCirurgica sem alterar o comportamento.
 */

type SuccessStepProps = {
  onNovoFaturamento: () => void;
  onIrParaFaturamentos: () => void;
};

export const SuccessStep: React.FC<SuccessStepProps> = ({
  onNovoFaturamento,
  onIrParaFaturamentos,
}) => (
  <div className="flex w-full flex-1 items-center justify-center">
    <div className="w-full max-w-md rounded-3xl border border-[#D4A017]/20 bg-black/40 p-8 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
      <h2 className="mt-4 text-2xl font-semibold text-[#F5F5F5]">Faturamento concluído</h2>
      <p className="mt-2 text-sm text-[#9CA3AF]">
        Seus documentos foram processados e o fluxo foi finalizado com sucesso.
      </p>
      <div className="mt-6 space-y-3">
        <Button
          type="button"
          className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black"
          onClick={onNovoFaturamento}
        >
          Iniciar novo faturamento
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
          onClick={onIrParaFaturamentos}
        >
          Ir para meus faturamentos
        </Button>
      </div>
    </div>
  </div>
);

export default SuccessStep;
