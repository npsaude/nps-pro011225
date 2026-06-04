import React, { createContext, useContext } from "react";
import type { FaturamentoView } from "../lib/flow-steps";

/**
 * Contexto do fluxo de envio de faturamento médico.
 *
 * Disponibiliza o estado essencial do fluxo (tela atual, dispatcher de
 * transição e refs dos inputs de arquivo) para os componentes de cada etapa,
 * evitando o "prop drilling" de dezenas de propriedades a partir da página.
 *
 * O valor é montado na página MedicoUploadDescricaoCirurgica e cresce de forma
 * incremental conforme novas etapas passam a consumir o contexto.
 */
export type TipoCirurgia = "ELETIVA" | "EMERGENCIAL";

export type FaturamentoFlowValue = {
  view: FaturamentoView;
  goTo: (next: FaturamentoView) => void;
  medicoNome: string;
  fileInputRefSolicitacao: React.MutableRefObject<HTMLInputElement | null>;
  fileInputRefGuia: React.MutableRefObject<HTMLInputElement | null>;
  fileInputRefDescricao: React.MutableRefObject<HTMLInputElement | null>;
  isUploading: boolean;
  tipoCirurgia: TipoCirurgia | null;
  setTipoCirurgia: React.Dispatch<React.SetStateAction<TipoCirurgia | null>>;
  onEnviarGuiaAutorizacao: () => void;
  onPularGuiaAutorizacao: () => void;
  onContinuarSemGuiaHonorarios: () => void | Promise<void>;
};

const FaturamentoFlowContext = createContext<FaturamentoFlowValue | null>(null);

export const FaturamentoFlowProvider = FaturamentoFlowContext.Provider;

export const useFaturamentoFlow = (): FaturamentoFlowValue => {
  const ctx = useContext(FaturamentoFlowContext);
  if (!ctx) {
    throw new Error(
      "useFaturamentoFlow deve ser usado dentro de FaturamentoFlowProvider",
    );
  }
  return ctx;
};
