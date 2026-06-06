/**
 * Modelo do fluxo (state machine) da página de envio de faturamento médico.
 *
 * Fonte única de verdade para:
 *  - os estados de tela (FaturamentoView), antes definidos inline na página;
 *  - o mapeamento de cada estado para o número do passo exibido na barra de
 *    progresso, substituindo o ternário aninhado que vivia no render.
 *
 * O uso de Record<FaturamentoView, number> garante, em tempo de compilação,
 * que todo estado tenha um passo associado.
 */

export type FaturamentoView =
  | "start"
  | "hospital"
  | "pergunta_solicitacao"
  | "upload_solicitacao"
  | "pergunta_guia_autorizacao"
  | "upload_guia"
  | "upload_descricao"
  | "pergunta_honorarios"
  | "gerando_honorarios"
  | "preview_honorarios"
  | "sem_modelo"
  | "success";

export const TOTAL_STEPS = 6;

const STEP_BY_VIEW: Record<FaturamentoView, number> = {
  start: 1,
  hospital: 1,
  pergunta_solicitacao: 2,
  upload_solicitacao: 3,
  pergunta_guia_autorizacao: 3,
  upload_guia: 3,
  upload_descricao: 4,
  pergunta_honorarios: 5,
  gerando_honorarios: 5,
  preview_honorarios: 5,
  sem_modelo: 5,
  success: 6,
};

/** Retorna o número do passo (1..TOTAL_STEPS) correspondente ao estado atual. */
export const getCurrentStep = (view: FaturamentoView): number => STEP_BY_VIEW[view];
