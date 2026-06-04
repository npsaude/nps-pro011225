import { supabase } from "@/integrations/supabase/client";
import type { DocItem } from "@/features/admin/forms/attachments";

const BUCKET = "NPS-pro";

/**
 * Resolve uma lista de paths do storage em itens de documento com signed URL.
 * Centraliza o loop de `createSignedUrl` que era duplicado nas páginas de guia.
 */
export async function createSignedDocItems(paths: string[]): Promise<DocItem[]> {
  return Promise.all(
    paths.map(async (path) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60);

      const fileName = path.split("/").pop() ?? path;
      const isImage = /\.(png|jpe?g|gif|webp)$/i.test(path);
      const isPdf = /\.pdf$/i.test(path);

      return { path, signedUrl: signed?.signedUrl ?? null, fileName, isImage, isPdf };
    }),
  );
}
