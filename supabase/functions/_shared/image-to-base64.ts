// @ts-nocheck
/**
 * Baixa uma imagem de uma URL e retorna como data URL base64.
 * Necessário para modelos que não aceitam URLs externas (ex: gpt-4 legado).
 */
export async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("[image-to-base64] Falha ao baixar imagem:", url, resp.status);
      return null;
    }
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();
    const arrayBuffer = await resp.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    // Converter para base64 em chunks para evitar stack overflow
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    return `data:${mimeType};base64,${base64}`;
  } catch (e) {
    console.error("[image-to-base64] Erro ao converter imagem para base64:", e);
    return null;
  }
}

/**
 * Converte uma lista de URLs de imagens para data URLs base64.
 * URLs que falharem são ignoradas.
 */
export async function imageUrlsToBase64(urls: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const url of urls) {
    const b64 = await imageUrlToBase64(url);
    if (b64) results.push(b64);
  }
  return results;
}
