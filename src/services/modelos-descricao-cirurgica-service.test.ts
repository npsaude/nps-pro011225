import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => {
  const single = vi.fn();
  const eqSelect = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq: eqSelect }));
  const eqUpdate = vi.fn(() => Promise.resolve({ error: null }));
  const update = vi.fn(() => ({ eq: eqUpdate }));
  const insert = vi.fn(() => Promise.resolve({ error: null }));
  const from = vi.fn(() => ({ select, update, insert }));

  const createSignedUrl = vi.fn();
  const upload = vi.fn();
  const storageFrom = vi.fn(() => ({ createSignedUrl, upload }));

  return { single, eqSelect, select, eqUpdate, update, insert, from, createSignedUrl, upload, storageFrom };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: m.from, storage: { from: m.storageFrom } },
}));

import {
  fetchModeloDescricaoCirurgica,
  createSignedModeloImageUrl,
  uploadModeloImage,
  saveModeloDescricaoCirurgica,
} from "@/services/modelos-descricao-cirurgica-service";

describe("modelos-descricao-cirurgica-service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetchModeloDescricaoCirurgica busca por id na tabela certa e retorna a linha", async () => {
    m.single.mockResolvedValueOnce({ data: { id: "x1", nome: "Hosp" }, error: null });
    const row = await fetchModeloDescricaoCirurgica("x1");
    expect(m.from).toHaveBeenCalledWith("modelos_descricao_cirurgica");
    expect(m.eqSelect).toHaveBeenCalledWith("id", "x1");
    expect(row).toEqual({ id: "x1", nome: "Hosp" });
  });

  it("fetchModeloDescricaoCirurgica retorna null quando há erro", async () => {
    m.single.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    expect(await fetchModeloDescricaoCirurgica("x1")).toBeNull();
  });

  it("createSignedModeloImageUrl retorna a signed URL", async () => {
    m.createSignedUrl.mockResolvedValueOnce({ data: { signedUrl: "https://x/y" } });
    expect(await createSignedModeloImageUrl("p/q.png")).toBe("https://x/y");
    expect(m.storageFrom).toHaveBeenCalledWith("NPS-pro");
    expect(m.createSignedUrl).toHaveBeenCalledWith("p/q.png", 3600);
  });

  it("createSignedModeloImageUrl retorna null quando não há URL", async () => {
    m.createSignedUrl.mockResolvedValueOnce({ data: null });
    expect(await createSignedModeloImageUrl("p/q.png")).toBeNull();
  });

  it("uploadModeloImage envia o arquivo e retorna o path gerado", async () => {
    m.upload.mockResolvedValueOnce({ error: null });
    const file = { name: "foto.jpeg", type: "image/jpeg" } as unknown as File;
    const path = await uploadModeloImage(file, "destaque");
    expect(path).toMatch(/^modelos_descricao_cirurgica\/destaque\/\d+\.jpeg$/);
    expect(m.upload).toHaveBeenCalledWith(
      path,
      file,
      { cacheControl: "3600", upsert: false, contentType: "image/jpeg" },
    );
  });

  it("uploadModeloImage lança quando o storage retorna erro", async () => {
    m.upload.mockResolvedValueOnce({ error: { message: "falhou" } });
    const file = { name: "x.png", type: "image/png" } as unknown as File;
    await expect(uploadModeloImage(file, "descricao")).rejects.toThrow("Erro ao fazer upload: falhou");
  });

  it("saveModeloDescricaoCirurgica insere quando não há id", async () => {
    await saveModeloDescricaoCirurgica({ nome: "A" });
    expect(m.insert).toHaveBeenCalledWith({ nome: "A" });
    expect(m.update).not.toHaveBeenCalled();
  });

  it("saveModeloDescricaoCirurgica atualiza quando há id", async () => {
    await saveModeloDescricaoCirurgica({ nome: "A" }, "x1");
    expect(m.update).toHaveBeenCalledWith({ nome: "A" });
    expect(m.eqUpdate).toHaveBeenCalledWith("id", "x1");
    expect(m.insert).not.toHaveBeenCalled();
  });
});
