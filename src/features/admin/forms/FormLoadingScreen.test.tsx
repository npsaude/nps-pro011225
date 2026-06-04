import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FormLoadingScreen from "./FormLoadingScreen";

describe("FormLoadingScreen", () => {
  it("usa a mensagem padrão", () => {
    render(<FormLoadingScreen />);
    expect(screen.getByText("Carregando dados da guia...")).toBeInTheDocument();
  });

  it("aceita uma mensagem customizada", () => {
    render(<FormLoadingScreen message="Carregando..." />);
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });
});
