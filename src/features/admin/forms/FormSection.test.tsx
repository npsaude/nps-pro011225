import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import FormSection from "./FormSection";

describe("FormSection", () => {
  it("renderiza o título e o conteúdo da seção", () => {
    render(
      <FormSection icon={FileText} color="bg-blue-600" title="Identificação">
        <span>conteúdo</span>
      </FormSection>,
    );
    expect(screen.getByText("Identificação")).toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});
