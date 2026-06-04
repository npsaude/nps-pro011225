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
    storage: {
      from: () => ({
        list: () => Promise.resolve({ data: [], error: null }),
        createSignedUrl: () => Promise.resolve({ data: null, error: null }),
      }),
    },
  },
}));

import DescricaoCirurgicaAdminFormPage from "@/pages/DescricaoCirurgicaAdminForm";

describe("DescricaoCirurgicaAdminForm (render)", () => {
  it("renderiza o formulário em modo de criação", () => {
    render(
      <MemoryRouter>
        <DescricaoCirurgicaAdminFormPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Nova Descrição Cirúrgica")).toBeInTheDocument();
    // Âncoras: campo regular, os dois Selects (Sexo/Status) e o textarea da descrição.
    expect(screen.getByText("Prontuário")).toBeInTheDocument();
    expect(screen.getByText("Sexo")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Texto da Descrição")).toBeInTheDocument();
    expect(screen.getByText("Salvar Descrição")).toBeInTheDocument();
  });
});
