import { useEffect, useState } from "react";
import {
  FolderOpen,
  FileIcon,
  ImageIcon,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useAccentTokens } from "./FormAccentContext";
import type { DocItem } from "./attachments";

/**
 * Painel de anexos (lista de documentos com preview, lightbox e, opcionalmente,
 * preview de PDF). Apresentação pura: os documentos — incluindo os signed URLs —
 * são fornecidos por `loadDocs`, que vive na página/serviço (storage permanece
 * na camada de dados). Markup preservado a partir das páginas de guia.
 */
export default function AttachmentsPanel({
  loadDocs,
  supportsPdf = false,
}: {
  loadDocs: () => Promise<DocItem[]>;
  supportsPdf?: boolean;
}) {
  const tokens = useAccentTokens();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const items = await loadDocs();
      setDocs(items);
      setLoading(false);
    })();
  }, [loadDocs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando documentos...</span>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
        <FolderOpen className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">Nenhum documento enviado</p>
        <p className="mt-1 text-xs text-slate-400">
          Os arquivos enviados via upload aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {docs.map((doc) => (
          <div
            key={doc.path}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md"
          >
            {/* Preview */}
            <div className="flex h-40 items-center justify-center overflow-hidden bg-slate-50">
              {doc.isImage && doc.signedUrl ? (
                <img
                  src={doc.signedUrl}
                  alt={doc.fileName}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : supportsPdf && doc.isPdf && doc.signedUrl ? (
                <iframe
                  src={doc.signedUrl}
                  title={doc.fileName}
                  className="h-full w-full border-0 pointer-events-none"
                  scrolling="no"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <FileIcon className="h-12 w-12" />
                  <span className="text-[11px] text-slate-400">Documento</span>
                </div>
              )}
            </div>

            {/* Info + ações */}
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                {doc.isImage ? (
                  <ImageIcon className={`h-4 w-4 flex-shrink-0 ${tokens.docIcon}`} />
                ) : (
                  <FileIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                )}
                <span className="truncate text-xs text-slate-600" title={doc.fileName}>
                  {doc.fileName}
                </span>
              </div>
              {doc.signedUrl && (
                <a
                  href={doc.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir em nova aba"
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition ${tokens.docHover}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Clique para ampliar imagem */}
            {doc.isImage && doc.signedUrl && (
              <button
                onClick={() => setLightbox(doc.signedUrl)}
                className="absolute inset-0 h-40 w-full cursor-zoom-in"
                aria-label="Ampliar imagem"
              />
            )}

            {/* Clique para abrir PDF em nova aba */}
            {supportsPdf && doc.isPdf && doc.signedUrl && (
              <a
                href={doc.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 h-40 w-full cursor-pointer"
                aria-label="Abrir PDF"
              />
            )}
          </div>
        ))}
      </div>

      {/* Lightbox simples */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Visualização"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
