import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FormField from "./FormField";

describe("FormField", () => {
  it("renderiza o label e o controle filho", () => {
    render(
      <FormField label="Registro ANS">
        <input aria-label="campo" />
      </FormField>,
    );
    expect(screen.getByText("Registro ANS")).toBeInTheDocument();
    expect(screen.getByLabelText("campo")).toBeInTheDocument();
  });

  it("marca o indicador de obrigatório quando required", () => {
    render(
      <FormField label="Nome" required>
        <input aria-label="nome" />
      </FormField>,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });
});
