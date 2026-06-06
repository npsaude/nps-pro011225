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
  fetchGuiaSolicitacao,
  fetchGuiaSolicitacaoDocPaths,
  saveGuiaSolicitacao,
} from "@/services/guia-solicitacao-service";

describe("guia-solicitacao-service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchGuiaSolicitacao busca na tabela certa por id e retorna a linha", async () => {
    m.single.mockResolvedValueOnce({ data: { id: "g1", nome_beneficiario: "X" }, error: null });
    const row = await fetchGuiaSolicitacao("g1");
    expect(m.from).toHaveBeenCalledWith("guia_solicitacao");
    expect(m.eqSelect).toHaveBeenCalledWith("id", "g1");
    expect(row).toEqual({ id: "g1", nome_beneficiario: "X" });
  });

  it("fetchGuiaSolicitacao retorna null quando há erro", async () => {
    m.single.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    expect(await fetchGuiaSolicitacao("g1")).toBeNull();
  });

  it("fetchGuiaSolicitacaoDocPaths retorna o array de paths da coluna url_documentos", async () => {
    m.single.mockResolvedValueOnce({ data: { url_documentos: ["a.pdf", "b.png"] }, error: null });
    const paths = await fetchGuiaSolicitacaoDocPaths("g1");
    expect(m.from).toHaveBeenCalledWith("guia_solicitacao");
    expect(m.select).toHaveBeenCalledWith("url_documentos");
    expect(paths).toEqual(["a.pdf", "b.png"]);
  });

  it("fetchGuiaSolicitacaoDocPaths retorna [] quando não há documentos", async () => {
    m.single.mockResolvedValueOnce({ data: { url_documentos: null }, error: null });
    expect(await fetchGuiaSolicitacaoDocPaths("g1")).toEqual([]);
  });

  it("saveGuiaSolicitacao insere quando não há id", async () => {
    await saveGuiaSolicitacao({ a: 1 });
    expect(m.insert).toHaveBeenCalledWith({ a: 1 });
    expect(m.update).not.toHaveBeenCalled();
  });

  it("saveGuiaSolicitacao atualiza quando há id", async () => {
    await saveGuiaSolicitacao({ a: 1 }, "g1");
    expect(m.update).toHaveBeenCalledWith({ a: 1 });
    expect(m.eqUpdate).toHaveBeenCalledWith("id", "g1");
    expect(m.insert).not.toHaveBeenCalled();
  });
});
