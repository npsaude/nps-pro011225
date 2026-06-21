/**
 * Modelo de créditos do pacote contratado.
 *
 * Cada pacote (subscription_plans.description) vende uma quantidade de créditos
 * válida durante o período da assinatura (current_period_start → current_period_end).
 * O consumo reinicia a cada renovação do período (mês a partir da data de contratação).
 *
 * Custos por ação:
 *  - 1 faturamento  = 10 créditos
 *  - 1 acompanhamento (SADT) = 2 créditos
 */

export const CREDITS_PER_FATURAMENTO = 10;
export const CREDITS_PER_ACOMPANHAMENTO = 2;

/**
 * Extrai a quantidade de créditos da descrição do plano.
 * Aceita textos livres como "100 créditos", "Até 400 créditos", "250 creditos".
 * Retorna null quando não há um número de créditos definido (= sem limite).
 */
export function extractPlanCredits(description: string | null | undefined): number | null {
  if (!description) return null;
  const match = String(description).match(/(\d+)\s*cr[ée]ditos?/i);
  return match ? parseInt(match[1], 10) : null;
}
