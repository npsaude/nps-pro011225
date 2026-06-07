import { supabase } from "@/integrations/supabase/client";

/**
 * Utilitários compartilhados para envio/processamento de guias SADT de
 * acompanhamento. Usado tanto pelo envio individual (mobile) quanto pelo
 * envio em lote (desktop), onde cada arquivo é tratado como uma guia e o
 * sistema processa uma a uma.
 */

const BUCKET_NAME = "NPS-pro";

export const PROCESS_SADT_FUNCTION_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-sadt-acompanhamento";

export const isPdfFile = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

export const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

export type UploadItem = {
  data: Blob;
  contentType: string;
  suggestedName: string;
};

/** Converte cada página de um PDF em uma imagem PNG pronta para upload. */
export async function pdfToPngUploadItems(pdfFile: File): Promise<UploadItem[]> {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
    .default as string;

  GlobalWorkerOptions.workerSrc = workerUrl;

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

    await (page.render({ canvasContext: ctx, viewport, canvas } as any)
      .promise as Promise<void>);

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
}

/**
 * Expande uma lista de arquivos em itens de upload. PDFs viram uma imagem por
 * página; demais arquivos (imagens) são mantidos como estão.
 */
export async function expandFilesToUploadItems(
  inputFiles: File[],
): Promise<UploadItem[]> {
  const items: UploadItem[] = [];

  for (const file of inputFiles) {
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
}

/** Faz upload dos itens para o storage e retorna os paths salvos. */
export async function uploadSadtItems(
  userId: string,
  items: UploadItem[],
): Promise<string[]> {
  const uploadedFilePaths: string[] = [];

  for (const item of items) {
    const safeName = sanitizeFileName(item.suggestedName);
    const timestamp = Date.now();
    const filePath = `sadt_acompanhamento/${userId}/${timestamp}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, item.data, {
        cacheControl: "3600",
        upsert: false,
        contentType: item.contentType,
      });

    if (uploadError) {
      throw new Error(`Falha ao enviar "${safeName}": ${uploadError.message}`);
    }

    uploadedFilePaths.push(filePath);
  }

  return uploadedFilePaths;
}

export interface GuiaExistente {
  id: string;
  numero_guia_prestador: string;
  nome_beneficiario: string | null;
  data_inicio_atendimento: string | null;
  valor_total_geral: string | number | null;
  created_at: string;
}

export type ProcessSadtResult =
  | { kind: "success"; sadtId: string | null }
  | {
      kind: "duplicate";
      numero_guia_prestador: string | null;
      nome_beneficiario: string | null;
      guia_existente: GuiaExistente | null;
    }
  | {
      kind: "not_owner";
      profissional_nome_guia: string | null;
      profissional_conselho_guia: string | null;
      nome_beneficiario: string | null;
      numero_guia_prestador: string | null;
    }
  | { kind: "error"; message: string };

/**
 * Chama a edge function que processa UMA guia SADT a partir dos paths já
 * enviados ao storage. Retorna um resultado tipado (sucesso, duplicada,
 * não-pertence ou erro) para o chamador decidir o próximo passo.
 */
export async function callProcessSadt(params: {
  userId: string;
  paths: string[];
  forceInsert?: boolean;
  forceOwnership?: boolean;
}): Promise<ProcessSadtResult> {
  const { userId, paths, forceInsert = false, forceOwnership = false } = params;

  let responseJson: any = null;
  try {
    const response = await fetch(PROCESS_SADT_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        files: paths.map((path) => ({ path })),
        forceInsert,
        forceOwnership,
      }),
    });

    try {
      responseJson = await response.json();
    } catch {
      // resposta sem corpo JSON
    }

    if (!response.ok || responseJson?.error) {
      return {
        kind: "error",
        message:
          responseJson?.error ??
          "Arquivos enviados, mas houve erro ao processar a SADT.",
      };
    }
  } catch (err) {
    return {
      kind: "error",
      message:
        err instanceof Error ? err.message : "Falha de rede ao processar a SADT.",
    };
  }

  if (responseJson?.not_owner === true) {
    return {
      kind: "not_owner",
      profissional_nome_guia: responseJson.profissional_nome_guia ?? null,
      profissional_conselho_guia:
        responseJson.profissional_conselho_guia ?? null,
      nome_beneficiario: responseJson.nome_beneficiario ?? null,
      numero_guia_prestador: responseJson.numero_guia_prestador ?? null,
    };
  }

  if (responseJson?.duplicate === true) {
    return {
      kind: "duplicate",
      numero_guia_prestador: responseJson.numero_guia_prestador ?? null,
      nome_beneficiario: responseJson.nome_beneficiario ?? null,
      guia_existente: responseJson.guia_existente ?? null,
    };
  }

  return {
    kind: "success",
    sadtId: responseJson?.sadt_acompanhamento_id ?? null,
  };
}
