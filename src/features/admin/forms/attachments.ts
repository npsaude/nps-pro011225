/**
 * Item de documento exibido no painel de anexos. O `signedUrl` é resolvido
 * na camada de dados (serviço de storage); o painel é apenas apresentação.
 */
export interface DocItem {
  path: string;
  signedUrl: string | null;
  fileName: string;
  isImage: boolean;
  isPdf: boolean;
}
