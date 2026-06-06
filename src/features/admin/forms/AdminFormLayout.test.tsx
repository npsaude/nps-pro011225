import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";

vi.mock("@/components/admin/AdminHeaderActions", () => ({ default: () => null }));

import AdminFormLayout from "./AdminFormLayout";

describe("AdminFormLayout", () => {
  it("renderiza sidebar, título, subtítulo e conteúdo", () => {
    render(
      <AdminFormLayout
        sidebar={<div>SIDEBAR</div>}
        accent="blue"
        icon={FileText}
        title="Nova Guia"
        subtitle="Preencha os dados"
        onBack={() => {}}
      >
        <div>CONTEUDO</div>
      </AdminFormLayout>,
    );
    expect(screen.getByText("SIDEBAR")).toBeInTheDocument();
    expect(screen.getByText("Nova Guia")).toBeInTheDocument();
    expect(screen.getByText("Preencha os dados")).toBeInTheDocument();
    expect(screen.getByText("CONTEUDO")).toBeInTheDocument();
  });
});
