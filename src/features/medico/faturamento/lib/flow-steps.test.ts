import { describe, it, expect } from "vitest";
import { getCurrentStep, TOTAL_STEPS, type FaturamentoView } from "./flow-steps";

describe("flow-steps", () => {
  it("expõe 6 passos no total", () => {
    expect(TOTAL_STEPS).toBe(6);
  });

  // Mapeamento idêntico ao ternário que existia no render da página.
  const cases: Array<[FaturamentoView, number]> = [
    ["start", 1],
    ["hospital", 1],
    ["pergunta_solicitacao", 2],
    ["upload_solicitacao", 3],
    ["pergunta_guia_autorizacao", 3],
    ["upload_guia", 3],
    ["upload_descricao", 4],
    ["pergunta_honorarios", 5],
    ["gerando_honorarios", 5],
    ["preview_honorarios", 5],
    ["sem_modelo", 5],
    ["success", 6],
  ];

  it.each(cases)("getCurrentStep(%s) === %i", (view, step) => {
    expect(getCurrentStep(view)).toBe(step);
  });

  it("nunca retorna passo fora do intervalo 1..TOTAL_STEPS", () => {
    for (const [view] of cases) {
      const step = getCurrentStep(view);
      expect(step).toBeGreaterThanOrEqual(1);
      expect(step).toBeLessThanOrEqual(TOTAL_STEPS);
    }
  });
});
