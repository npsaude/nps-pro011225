import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Isola o formulário das dependências pesadas (layout admin) e do Supabase,
// para um teste de render rápido que serve de âncora de regressão.
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

import GuiaSolicitacaoFormPage from "@/pages/GuiaSolicitacaoForm";

describe("GuiaSolicitacaoForm (render)", () => {
  it("renderiza o formulário em modo de criação", () => {
    render(
      <MemoryRouter>
        <GuiaSolicitacaoFormPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Nova Guia de Solicitação")).toBeInTheDocument();
    // Âncora de regressão dos campos dirigidos por config.
    expect(screen.getByText("Registro ANS")).toBeInTheDocument();
    expect(screen.getByText("Observações")).toBeInTheDocument();
    expect(screen.getByText("Salvar Guia")).toBeInTheDocument();
  });
});
