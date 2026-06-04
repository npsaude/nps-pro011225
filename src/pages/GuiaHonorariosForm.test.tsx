import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/admin/AdminSidebar", () => ({ default: () => null }));
vi.mock("@/components/admin/AdminHeaderActions", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      insert: () => Promise.resolve({ error: null }),
    }),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } } }) },
    storage: { from: () => ({ createSignedUrl: () => Promise.resolve({ data: null, error: null }) }) },
  },
}));

import GuiaHonorariosFormPage from "@/pages/GuiaHonorariosForm";

describe("GuiaHonorariosForm (render)", () => {
  it("renderiza o formulário em modo de criação", () => {
    render(
      <MemoryRouter>
        <GuiaHonorariosFormPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Nova Guia de Honorários")).toBeInTheDocument();
    // Âncoras: campo regular, grupo de procedimento cirúrgico, equipe e extra.
    expect(screen.getByText("Nome do Profissional")).toBeInTheDocument();
    expect(screen.getByText("Procedimento 1")).toBeInTheDocument();
    expect(screen.getByText("Instrumentador")).toBeInTheDocument();
    expect(screen.getByText("Extra 2")).toBeInTheDocument();
    expect(screen.getByText("Salvar Guia")).toBeInTheDocument();
  });
});
