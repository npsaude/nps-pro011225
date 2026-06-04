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
  fetchGuiaAutorizacao,
  saveGuiaAutorizacao,
} from "@/services/guia-autorizacao-service";

describe("guia-autorizacao-service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchGuiaAutorizacao busca em faturamentos por id e retorna a linha", async () => {
    m.single.mockResolvedValueOnce({ data: { id: "f1", paciente_nome: "Y" }, error: null });
    const row = await fetchGuiaAutorizacao("f1");
    expect(m.from).toHaveBeenCalledWith("faturamentos");
    expect(m.eqSelect).toHaveBeenCalledWith("id", "f1");
    expect(row).toEqual({ id: "f1", paciente_nome: "Y" });
  });

  it("fetchGuiaAutorizacao retorna null quando há erro", async () => {
    m.single.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    expect(await fetchGuiaAutorizacao("f1")).toBeNull();
  });

  it("saveGuiaAutorizacao insere quando não há id", async () => {
    await saveGuiaAutorizacao({ a: 1 });
    expect(m.insert).toHaveBeenCalledWith({ a: 1 });
    expect(m.update).not.toHaveBeenCalled();
  });

  it("saveGuiaAutorizacao atualiza quando há id", async () => {
    await saveGuiaAutorizacao({ a: 1 }, "f1");
    expect(m.update).toHaveBeenCalledWith({ a: 1 });
    expect(m.eqUpdate).toHaveBeenCalledWith("id", "f1");
    expect(m.insert).not.toHaveBeenCalled();
  });
});
