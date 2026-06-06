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

import SadtAcompanhamentoFormPage from "@/pages/SadtAcompanhamentoForm";

describe("SadtAcompanhamentoForm (render)", () => {
  it("renderiza o formulário em modo de criação", () => {
    render(
      <MemoryRouter>
        <SadtAcompanhamentoFormPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Nova SADT")).toBeInTheDocument();
    // Âncoras de regressão dos campos dirigidos por config.
    expect(screen.getByText("Registro ANS")).toBeInTheDocument();
    expect(screen.getByText("Indicação Clínica")).toBeInTheDocument();
    expect(screen.getByText("Salvar SADT")).toBeInTheDocument();
  });
});
