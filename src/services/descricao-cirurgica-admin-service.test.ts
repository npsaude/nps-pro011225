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
  fetchDescricaoCirurgicaRow,
  fetchDescricaoStorageFolder,
  salvarDescricaoCirurgicaAdmin,
} from "@/services/descricao-cirurgica-service";

describe("descricao-cirurgica-service (admin form)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchDescricaoCirurgicaRow faz select * por id na tabela certa", async () => {
    m.single.mockResolvedValueOnce({ data: { id: "d1" }, error: null });
    const row = await fetchDescricaoCirurgicaRow("d1");
    expect(m.from).toHaveBeenCalledWith("descricoes_cirurgicas");
    expect(m.select).toHaveBeenCalledWith("*");
    expect(m.eqSelect).toHaveBeenCalledWith("id", "d1");
    expect(row).toEqual({ id: "d1" });
  });

  it("fetchDescricaoStorageFolder seleciona só storage_folder", async () => {
    m.single.mockResolvedValueOnce({ data: { storage_folder: "f/x" }, error: null });
    const row = await fetchDescricaoStorageFolder("d1");
    expect(m.select).toHaveBeenCalledWith("storage_folder");
    expect(row).toEqual({ storage_folder: "f/x" });
  });

  it("fetch* retorna null quando há erro", async () => {
    m.single.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    expect(await fetchDescricaoCirurgicaRow("d1")).toBeNull();
  });

  it("salvarDescricaoCirurgicaAdmin insere sem id e atualiza com id", async () => {
    await salvarDescricaoCirurgicaAdmin({ a: 1 });
    expect(m.insert).toHaveBeenCalledWith({ a: 1 });

    await salvarDescricaoCirurgicaAdmin({ a: 2 }, "d1");
    expect(m.update).toHaveBeenCalledWith({ a: 2 });
    expect(m.eqUpdate).toHaveBeenCalledWith("id", "d1");
  });
});
