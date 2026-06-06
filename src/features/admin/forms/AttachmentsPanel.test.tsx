import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FormAccentProvider } from "./FormAccentContext";
import AttachmentsPanel from "./AttachmentsPanel";
import type { DocItem } from "./attachments";

function renderPanel(docs: DocItem[]) {
  return render(
    <FormAccentProvider accent="blue">
      <AttachmentsPanel loadDocs={async () => docs} />
    </FormAccentProvider>,
  );
}

describe("AttachmentsPanel", () => {
  it("mostra o estado vazio quando não há documentos", async () => {
    renderPanel([]);
    await waitFor(() =>
      expect(screen.getByText("Nenhum documento enviado")).toBeInTheDocument(),
    );
  });

  it("lista os documentos retornados por loadDocs", async () => {
    renderPanel([
      { path: "a/foto.png", signedUrl: "https://x/1", fileName: "foto.png", isImage: true, isPdf: false },
    ]);
    await waitFor(() => expect(screen.getByText("foto.png")).toBeInTheDocument());
  });
});
