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

import GuiaAutorizacaoFormPage from "@/pages/GuiaAutorizacaoForm";

describe("GuiaAutorizacaoForm (render)", () => {
  it("renderiza o formulário em modo de criação", () => {
    render(
      <MemoryRouter>
        <GuiaAutorizacaoFormPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Nova Guia de Autorização")).toBeInTheDocument();
    // Âncoras de regressão: campo regular, bloco de auxiliares e Select de status.
    expect(screen.getByText("Nº Autorização")).toBeInTheDocument();
    expect(screen.getByText("Anestesista")).toBeInTheDocument();
    expect(screen.getByText("Status de Pagamento")).toBeInTheDocument();
    expect(screen.getByText("Salvar Guia")).toBeInTheDocument();
  });
});
