import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @/utils/image-compression so isHeicFile is controllable and the module
// can be imported in jsdom without the real HEIC dependency.
// ---------------------------------------------------------------------------
vi.mock("@/utils/image-compression", () => ({
  isHeicFile: (file: File) =>
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif"),
  compressFiles: async (files: File[]) => files,
}));

// pdfjs-dist is not available/functional in jsdom — mock it so the module
// loads without errors (we do not test pdfToPngUploadItems here).
vi.mock("pdfjs-dist", () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: "" },
}));

import {
  isPdfFile,
  isUnsupportedRawFormat,
  sanitizeFileName,
  classifyUploadFiles,
} from "./file-upload";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeFile = (name: string, type: string, content = "x") =>
  new File([content], name, { type });

// ---------------------------------------------------------------------------
// sanitizeFileName
// ---------------------------------------------------------------------------

describe("sanitizeFileName", () => {
  it("keeps alphanumeric characters unchanged", () => {
    expect(sanitizeFileName("abc123")).toBe("abc123");
  });

  it("keeps dots, hyphens and underscores", () => {
    expect(sanitizeFileName("file_name-v1.0")).toBe("file_name-v1.0");
  });

  it("replaces spaces with underscores", () => {
    expect(sanitizeFileName("my file name")).toBe("my_file_name");
  });

  it("replaces special characters with underscores", () => {
    expect(sanitizeFileName("foto (1)!@#.png")).toBe("foto__1____.png");
  });

  it("replaces accented / non-ASCII letters with underscores", () => {
    // The exact output depends on how many bytes each accented character uses
    // in the source string. We verify that no non-ASCII character survives.
    const result = sanitizeFileName("descricão cirúrgica");
    expect(result).not.toMatch(/[^a-zA-Z0-9.\-_]/);
  });

  it("returns empty string unchanged", () => {
    expect(sanitizeFileName("")).toBe("");
  });

  it("preserves uppercase letters", () => {
    expect(sanitizeFileName("MyFile.PNG")).toBe("MyFile.PNG");
  });
});

// ---------------------------------------------------------------------------
// isPdfFile
// ---------------------------------------------------------------------------

describe("isPdfFile", () => {
  it("returns true for application/pdf mime type", () => {
    const file = makeFile("document.pdf", "application/pdf");
    expect(isPdfFile(file)).toBe(true);
  });

  it("returns true for .pdf extension regardless of mime type", () => {
    const file = makeFile("document.pdf", "");
    expect(isPdfFile(file)).toBe(true);
  });

  it("returns true for .PDF extension (case-insensitive)", () => {
    const file = makeFile("DOCUMENT.PDF", "");
    expect(isPdfFile(file)).toBe(true);
  });

  it("returns false for a JPEG image", () => {
    const file = makeFile("photo.jpg", "image/jpeg");
    expect(isPdfFile(file)).toBe(false);
  });

  it("returns false for a PNG image", () => {
    const file = makeFile("image.png", "image/png");
    expect(isPdfFile(file)).toBe(false);
  });

  it("returns false for a file with no extension and no matching mime", () => {
    const file = makeFile("noextension", "application/octet-stream");
    expect(isPdfFile(file)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isUnsupportedRawFormat
// ---------------------------------------------------------------------------

describe("isUnsupportedRawFormat", () => {
  const rawCases: [string, string][] = [
    ["photo.dng", "image/x-adobe-dng"],
    ["photo.cr2", "image/x-canon-cr2"],
    ["photo.cr3", "image/x-canon-cr3"],
    ["photo.nef", "image/x-nikon-nef"],
    ["photo.arw", "image/x-sony-arw"],
    ["photo.orf", "image/x-olympus-orf"],
    ["photo.rw2", "image/x-panasonic-rw2"],
    ["photo.raf", "image/x-fuji-raf"],
    ["photo.raw", "image/x-raw"],
  ];

  it.each(rawCases)("returns true for %s", (name, type) => {
    const file = makeFile(name, type);
    expect(isUnsupportedRawFormat(file)).toBe(true);
  });

  it("is case-insensitive — returns true for .DNG uppercase extension", () => {
    const file = makeFile("PHOTO.DNG", "");
    expect(isUnsupportedRawFormat(file)).toBe(true);
  });

  it("returns false for .jpg", () => {
    const file = makeFile("photo.jpg", "image/jpeg");
    expect(isUnsupportedRawFormat(file)).toBe(false);
  });

  it("returns false for .png", () => {
    const file = makeFile("image.png", "image/png");
    expect(isUnsupportedRawFormat(file)).toBe(false);
  });

  it("returns false for .pdf", () => {
    const file = makeFile("doc.pdf", "application/pdf");
    expect(isUnsupportedRawFormat(file)).toBe(false);
  });

  it("returns false for .heic", () => {
    const file = makeFile("photo.heic", "image/heic");
    expect(isUnsupportedRawFormat(file)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// classifyUploadFiles
// ---------------------------------------------------------------------------

describe("classifyUploadFiles", () => {
  it("allows standard image files", () => {
    const files = [
      makeFile("a.jpg", "image/jpeg"),
      makeFile("b.png", "image/png"),
      makeFile("c.webp", "image/webp"),
    ];
    const { allowed, hasRawFiles, ignoredCount } = classifyUploadFiles(files);
    expect(allowed).toHaveLength(3);
    expect(hasRawFiles).toBe(false);
    expect(ignoredCount).toBe(0);
  });

  it("allows PDF files", () => {
    const files = [makeFile("doc.pdf", "application/pdf")];
    const { allowed, hasRawFiles, ignoredCount } = classifyUploadFiles(files);
    expect(allowed).toHaveLength(1);
    expect(hasRawFiles).toBe(false);
    expect(ignoredCount).toBe(0);
  });

  it("allows HEIC files (detected by extension via isHeicFile)", () => {
    const files = [makeFile("photo.heic", "")];
    const { allowed, hasRawFiles, ignoredCount } = classifyUploadFiles(files);
    expect(allowed).toHaveLength(1);
    expect(hasRawFiles).toBe(false);
    expect(ignoredCount).toBe(0);
  });

  it("rejects RAW files and sets hasRawFiles to true", () => {
    const files = [makeFile("photo.cr2", "image/x-canon-cr2")];
    const { allowed, hasRawFiles, ignoredCount } = classifyUploadFiles(files);
    expect(allowed).toHaveLength(0);
    expect(hasRawFiles).toBe(true);
    expect(ignoredCount).toBe(1);
  });

  it("rejects unknown/unsupported types and counts them as ignored", () => {
    const files = [makeFile("file.txt", "text/plain")];
    const { allowed, hasRawFiles, ignoredCount } = classifyUploadFiles(files);
    expect(allowed).toHaveLength(0);
    expect(hasRawFiles).toBe(false);
    expect(ignoredCount).toBe(1);
  });

  it("correctly handles a mixed batch", () => {
    const files = [
      makeFile("good.jpg", "image/jpeg"),
      makeFile("also-good.pdf", "application/pdf"),
      makeFile("raw.dng", "image/x-adobe-dng"),
      makeFile("unsupported.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ];
    const { allowed, hasRawFiles, ignoredCount } = classifyUploadFiles(files);
    expect(allowed).toHaveLength(2);
    expect(hasRawFiles).toBe(true);
    expect(ignoredCount).toBe(2);
  });

  it("returns empty allowed and no raw files for an empty array", () => {
    const { allowed, hasRawFiles, ignoredCount } = classifyUploadFiles([]);
    expect(allowed).toHaveLength(0);
    expect(hasRawFiles).toBe(false);
    expect(ignoredCount).toBe(0);
  });

  it("does not include allowed files that also match RAW extensions", () => {
    // A file that has image/ mime but a RAW extension should still be rejected.
    const file = makeFile("trick.nef", "image/jpeg");
    const { allowed } = classifyUploadFiles([file]);
    expect(allowed).toHaveLength(0);
  });
});
