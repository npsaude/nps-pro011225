import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => {
  const createSignedUrl = vi.fn();
  const from = vi.fn(() => ({ createSignedUrl }));
  return { createSignedUrl, from };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: m.from } },
}));

import { createSignedDocItems } from "@/services/storage-docs-service";

describe("storage-docs-service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolve paths em itens com signed URL, nome e flags de tipo", async () => {
    m.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://x/y" }, error: null });

    const items = await createSignedDocItems(["a/b/foto.PNG", "docs/contrato.pdf"]);

    expect(m.from).toHaveBeenCalledWith("NPS-pro");
    expect(m.createSignedUrl).toHaveBeenCalledWith("a/b/foto.PNG", 3600);
    expect(items).toEqual([
      { path: "a/b/foto.PNG", signedUrl: "https://x/y", fileName: "foto.PNG", isImage: true, isPdf: false },
      { path: "docs/contrato.pdf", signedUrl: "https://x/y", fileName: "contrato.pdf", isImage: false, isPdf: true },
    ]);
  });

  it("usa signedUrl null quando o storage não retorna URL", async () => {
    m.createSignedUrl.mockResolvedValue({ data: null, error: { message: "boom" } });
    const items = await createSignedDocItems(["x.txt"]);
    expect(items[0].signedUrl).toBeNull();
    expect(items[0].isImage).toBe(false);
  });
});
