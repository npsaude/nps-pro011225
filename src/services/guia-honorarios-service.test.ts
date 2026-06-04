import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => {
  const single = vi.fn();
  const eqSelect = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq: eqSelect }));
  const eqUpdate = vi.fn(() => Promise.resolve({ error: null }));
  const update = vi.fn(() => ({ eq: eqUpdate }));
  const insert = vi.fn(() => Promise.resolve({ error: null }));
  const from = vi.fn(() => ({ select, update, insert }));
  return { single, eqSelect, select, eqUpdate, update, insert, from };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: m.from } }));

import {
  fetchGuiaHonorarios,
  fetchGuiaHonorariosPdfField,
  saveGuiaHonorarios,
} from "@/services/guia-honorarios-service";

describe("guia-honorarios-service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchGuiaHonorarios faz select * por id na tabela certa", async () => {
    m.single.mockResolvedValueOnce({ data: { id: "h1" }, error: null });
    const row = await fetchGuiaHonorarios("h1");
    expect(m.from).toHaveBeenCalledWith("guia_honorarios");
    expect(m.select).toHaveBeenCalledWith("*");
    expect(m.eqSelect).toHaveBeenCalledWith("id", "h1");
    expect(row).toEqual({ id: "h1" });
  });

  it("fetchGuiaHonorariosPdfField seleciona só o campo do pdf", async () => {
    m.single.mockResolvedValueOnce({ data: { pdf_guia_honorario: "p.pdf" }, error: null });
    const row = await fetchGuiaHonorariosPdfField("h1");
    expect(m.select).toHaveBeenCalledWith("pdf_guia_honorario");
    expect(row).toEqual({ pdf_guia_honorario: "p.pdf" });
  });

  it("fetch* retorna null quando há erro", async () => {
    m.single.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    expect(await fetchGuiaHonorarios("h1")).toBeNull();
  });

  it("saveGuiaHonorarios insere quando não há id e atualiza quando há", async () => {
    await saveGuiaHonorarios({ a: 1 });
    expect(m.insert).toHaveBeenCalledWith({ a: 1 });

    await saveGuiaHonorarios({ a: 2 }, "h1");
    expect(m.update).toHaveBeenCalledWith({ a: 2 });
    expect(m.eqUpdate).toHaveBeenCalledWith("id", "h1");
  });
});
