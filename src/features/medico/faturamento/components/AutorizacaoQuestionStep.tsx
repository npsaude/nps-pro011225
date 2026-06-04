import React from "react";
import { Calendar, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFaturamentoFlow } from "../context/flow-context";

/**
 * Tela "Guia de Autorização de Cirurgia": seleção do tipo de cirurgia
 * (eletiva/emergencial) e decisão de enviar ou pular a guia de autorização.
 * Consome o contexto de fluxo. Extraída da página sem alterar o comportamento.
 */
export const AutorizacaoQuestionStep: React.FC = () => {
  const {
    tipoCirurgia,
    setTipoCirurgia,
    isUploading,
    onEnviarGuiaAutorizacao,
    onPularGuiaAutorizacao,
  } = useFaturamentoFlow();

  return (
    <div className="mt-2 flex w-full max-w-md flex-col items-center">
      <div className="w-full rounded-2xl bg-black/70 backdrop-blur-xl px-6 py-8 shadow-[0_0_40px_rgba(212,160,23,0.12)] border border-[#D4A017]/20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_30px_rgba(212,160,23,0.35)]">
          <Calendar className="h-8 w-8" />
        </div>

        <h2 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl mb-2">
          Guia de Autorização de Cirurgia
        </h2>
        <p className="text-xs text-[#9CA3AF] sm:text-sm mb-6">
          Antes de continuar, selecione o tipo de cirurgia e informe se deseja enviar a guia de autorização.
        </p>

        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold text-[#F5F5F5]">
            Qual o tipo de cirurgia?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipoCirurgia("ELETIVA")}
              className={`group rounded-2xl border px-4 py-4 text-left transition-colors ${
                tipoCirurgia === "ELETIVA"
                  ? "border-[#FFD700]/60 bg-[#FFD700]/10"
                  : "border-[#D4A017]/15 bg-black/40 hover:border-[#D4A017]/35"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                    tipoCirurgia === "ELETIVA"
                      ? "border-[#FFD700]/40 bg-[#FFD700]/20 text-[#FFD700]"
                      : "border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]"
                  }`}
                >
                  <Calendar className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#F5F5F5]">
                    Eletiva
                  </p>
                  <p className="text-[11px] text-[#9CA3AF]">Agendada</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTipoCirurgia("EMERGENCIAL")}
              className={`group rounded-2xl border px-4 py-4 text-left transition-colors ${
                tipoCirurgia === "EMERGENCIAL"
                  ? "border-[#FFD700]/60 bg-[#FFD700]/10"
                  : "border-[#D4A017]/15 bg-black/40 hover:border-[#D4A017]/35"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                    tipoCirurgia === "EMERGENCIAL"
                      ? "border-[#FFD700]/40 bg-[#FFD700]/20 text-[#FFD700]"
                      : "border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]"
                  }`}
                >
                  <Zap className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#F5F5F5]">
                    Emergencial
                  </p>
                  <p className="text-[11px] text-[#9CA3AF]">Urgência</p>
                </div>
              </div>
            </button>
          </div>

          {!tipoCirurgia && (
            <p className="mt-3 text-[11px] text-[#D4A017]">
              Selecione o tipo de cirurgia para continuar.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
            disabled={!tipoCirurgia || isUploading}
            onClick={onEnviarGuiaAutorizacao}
          >
            Sim, enviar guia
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
            disabled={!tipoCirurgia || isUploading}
            onClick={onPularGuiaAutorizacao}
          >
            Não, continuar sem guia
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AutorizacaoQuestionStep;
