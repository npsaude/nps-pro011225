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
vi.mock("@/components/sadt/types", () => ({}));

import {
  fetchSadtAcompanhamento,
  fetchSadtAcompanhamentoDocs,
  saveSadtAcompanhamento,
} from "@/services/sadt-service";

describe("sadt-service (acompanhamento form)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchSadtAcompanhamento faz select * por id na tabela certa", async () => {
    m.single.mockResolvedValueOnce({ data: { id: "s1" }, error: null });
    const row = await fetchSadtAcompanhamento("s1");
    expect(m.from).toHaveBeenCalledWith("sadt_acompanhamento");
    expect(m.select).toHaveBeenCalledWith("*");
    expect(m.eqSelect).toHaveBeenCalledWith("id", "s1");
    expect(row).toEqual({ id: "s1" });
  });

  it("fetchSadtAcompanhamentoDocs seleciona só url_documentos", async () => {
    m.single.mockResolvedValueOnce({ data: { url_documentos: ["a"] }, error: null });
    const row = await fetchSadtAcompanhamentoDocs("s1");
    expect(m.select).toHaveBeenCalledWith("url_documentos");
    expect(row).toEqual({ url_documentos: ["a"] });
  });

  it("fetch* retorna null quando há erro", async () => {
    m.single.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    expect(await fetchSadtAcompanhamento("s1")).toBeNull();
  });

  it("saveSadtAcompanhamento insere quando não há id e atualiza quando há", async () => {
    await saveSadtAcompanhamento({ a: 1 });
    expect(m.insert).toHaveBeenCalledWith({ a: 1 });

    await saveSadtAcompanhamento({ a: 2 }, "s1");
    expect(m.update).toHaveBeenCalledWith({ a: 2 });
    expect(m.eqUpdate).toHaveBeenCalledWith("id", "s1");
  });
});
