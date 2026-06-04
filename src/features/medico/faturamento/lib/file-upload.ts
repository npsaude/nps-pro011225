/**
 * Módulo centralizado de utilitários para upload de arquivos médicos.
 * Centraliza as funções de auxílio ao upload de arquivos que anteriormente
 * estavam duplicadas nas páginas MedicoUpload* (MedicoUploadDescricaoCirurgica,
 * etc.), facilitando a reutilização e a manutenção consistente dessas rotinas.
 *
 * Nota: o worker do pdfjs-dist (GlobalWorkerOptions.workerSrc) deve ser
 * configurado pela aplicação antes de chamar pdfToPngUploadItems ou
 * expandFilesToUploadItems. Este módulo apenas importa getDocument e assume
 * que o worker já foi registrado.
 */

import { getDocument } from "pdfjs-dist";
import { isHeicFile } from "@/utils/image-compression";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadItem = {
  data: Blob;
  contentType: string;
  suggestedName: string;
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Verifica se o arquivo é um PDF, seja pelo mime-type ou pela extensão .pdf
 * (insensível a maiúsculas/minúsculas).
 */
export const isPdfFile = (file: File): boolean =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

/**
 * Verifica se o arquivo está em um formato RAW não suportado
 * (.dng, .cr2, .cr3, .nef, .arw, .orf, .rw2, .raf, .raw).
 */
export const isUnsupportedRawFormat = (file: File): boolean => {
  const rawExtensions = [".dng", ".cr2", ".cr3", ".nef", ".arw", ".orf", ".rw2", ".raf", ".raw"];
  const name = file.name.toLowerCase();
  return rawExtensions.some((ext) => name.endsWith(ext));
};

/**
 * Substitui todos os caracteres que não sejam letras (a-z, A-Z), dígitos
 * (0-9), ponto, hífen ou sublinhado por um sublinhado (_).
 */
export const sanitizeFileName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

// ---------------------------------------------------------------------------
// PDF → PNG conversion
// ---------------------------------------------------------------------------

/**
 * Converte cada página de um PDF em um UploadItem de imagem PNG,
 * renderizando via canvas em escala 2× para maior nitidez.
 *
 * Requer que GlobalWorkerOptions.workerSrc já esteja configurado pela aplicação.
 */
export const pdfToPngUploadItems = async (pdfFile: File): Promise<UploadItem[]> => {
  const data = await pdfFile.arrayBuffer();
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;

  const baseName = sanitizeFileName(
    pdfFile.name.replace(/\.pdf$/i, "") || "documento",
  );

  const items: UploadItem[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await (page.render({ canvasContext: ctx, viewport, canvas } as any).promise as Promise<void>);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (!b) {
          reject(new Error("Falha ao converter página do PDF em imagem."));
          return;
        }
        resolve(b);
      }, "image/png");
    });

    items.push({
      data: blob,
      contentType: "image/png",
      suggestedName: `${baseName}_p${pageNum}.png`,
    });
  }

  return items;
};

// ---------------------------------------------------------------------------
// Expand files
// ---------------------------------------------------------------------------

/**
 * Expande uma lista de arquivos em UploadItems: PDFs são convertidos página
 * a página em PNGs; demais arquivos são embrulhados diretamente.
 */
export const expandFilesToUploadItems = async (files: File[]): Promise<UploadItem[]> => {
  const items: UploadItem[] = [];

  for (const file of files) {
    if (isPdfFile(file)) {
      const pdfItems = await pdfToPngUploadItems(file);
      items.push(...pdfItems);
      continue;
    }

    items.push({
      data: file,
      contentType: file.type || "application/octet-stream",
      suggestedName: file.name,
    });
  }

  return items;
};

// ---------------------------------------------------------------------------
// Shared file classification helper
// ---------------------------------------------------------------------------

/**
 * Classifica uma lista de arquivos selecionados pelo usuário, aplicando o
 * mesmo predicado utilizado nos handlers handleFileChangeGuia,
 * handleFileChangeDescricao e handleFileChangeSolicitacao da página
 * MedicoUploadDescricaoCirurgica.
 *
 * Retorna:
 *  - allowed: arquivos aceitos (imagem/*, application/pdf ou HEIC, e não RAW)
 *  - hasRawFiles: true se ao menos um arquivo RAW foi detectado
 *  - ignoredCount: quantidade de arquivos descartados (RAW + outros não permitidos)
 */
export const classifyUploadFiles = (
  files: File[],
): { allowed: File[]; hasRawFiles: boolean; ignoredCount: number } => {
  const hasRawFiles = files.some(isUnsupportedRawFormat);

  const allowed = files.filter(
    (file) =>
      (file.type.startsWith("image/") || file.type === "application/pdf" || isHeicFile(file)) &&
      !isUnsupportedRawFormat(file),
  );

  const ignoredCount = files.length - allowed.length;

  return { allowed, hasRawFiles, ignoredCount };
};
