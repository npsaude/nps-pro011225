import { describe, it, expect } from "vitest";

// Smoke test — confirma que o runner, o ambiente jsdom e os aliases
// estão configurados corretamente. Serve de base para os testes de
// regressão criados ao longo da refatoração do módulo /medico.
describe("infra de testes", () => {
  it("executa o vitest no ambiente jsdom", () => {
    expect(typeof window).toBe("object");
    expect(document.createElement("div")).toBeInstanceOf(HTMLElement);
  });
});
