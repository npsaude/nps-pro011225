import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { FormAccentProvider } from "./FormAccentContext";
import AdminFormTabs from "./AdminFormTabs";

function renderTabs(isEdit: boolean) {
  return render(
    <FormAccentProvider accent="blue">
      <AdminFormTabs
        isEdit={isEdit}
        dadosIcon={FileText}
        formId="f"
        onSubmit={(e) => e.preventDefault()}
        saving={false}
        onCancel={() => {}}
        documentos={<div>PAINEL DOCS</div>}
      >
        <div>SECOES</div>
      </AdminFormTabs>
    </FormAccentProvider>,
  );
}

describe("AdminFormTabs", () => {
  it("em criação mostra só o form (sem abas)", () => {
    renderTabs(false);
    expect(screen.getByText("SECOES")).toBeInTheDocument();
    expect(screen.getByText("Salvar Guia")).toBeInTheDocument();
    expect(screen.queryByText("Documentos")).not.toBeInTheDocument();
  });

  it("em edição mostra as abas Dados/Documentos e o label de edição", () => {
    renderTabs(true);
    expect(screen.getByText("Dados da Guia")).toBeInTheDocument();
    expect(screen.getByText("Documentos")).toBeInTheDocument();
    expect(screen.getByText("Salvar Alterações")).toBeInTheDocument();
  });
});
