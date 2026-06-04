import React from "react";
import type { LucideIcon } from "lucide-react";
import { Upload, Image as ImageIcon, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFaturamentoFlow } from "../context/flow-context";

/**
 * Tela genérica de upload de documentos (imagens/PDF), parametrizada por
 * documento. Unifica as três telas de upload antes duplicadas na página
 * (Guia de Solicitação, Guia de Autorização e Descrição Cirúrgica),
 * preservando o comportamento. Estado compartilhado (isUploading, medicoNome)
 * vem do contexto de fluxo; o que é específico do documento chega por props.
 */
type UploadStepProps = {
  /** Rótulo destacado do documento, ex.: "Guia de Solicitação". */
  docLabel: string;
  /** Frase introdutória antes do rótulo, ex.: "Faça upload das imagens da". */
  emptyLead: string;
  /** Observação auxiliar exibida no estado vazio. */
  emptyObs: string;
  /** Ícone exibido na área de drop. */
  dropIcon?: LucideIcon;
  /** Rótulo do botão de processar, ex.: "Processar Guia". */
  processarLabel: string;
  inputId: string;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  files: File[];
  onFilesChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAdicionarMais: () => void;
  onRemover: (index: number) => void;
  onProcessar: () => void;
  onVoltar: () => void;
};

const isImage = (file: File) => file.type.startsWith("image/");

const arquivosLabelFrom = (total: number) =>
  total === 0 ? "Nenhum arquivo" : total === 1 ? "1 arquivo" : `${total} arquivos`;

export const UploadStep: React.FC<UploadStepProps> = ({
  docLabel,
  emptyLead,
  emptyObs,
  dropIcon: DropIcon = Upload,
  processarLabel,
  inputId,
  inputRef,
  files,
  onFilesChange,
  onAdicionarMais,
  onRemover,
  onProcessar,
  onVoltar,
}) => {
  const { isUploading, medicoNome } = useFaturamentoFlow();

  return (
    <div className="mt-2 flex w-full max-w-md flex-col">
      <Input
        id={inputId}
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept="image/*,image/heic,image/heif,.heic,.heif,application/pdf"
        onChange={onFilesChange}
      />

      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl">
          {medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}
        </h1>
        <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
          {files.length === 0 ? (
            <>
              <span>
                {emptyLead}{" "}
                <span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">
                  {docLabel}
                </span>
                .
              </span>
              <br />
              <span className="text-[11px] text-[#6B7280] sm:text-xs">{emptyObs}</span>
            </>
          ) : (
            <>
              Confira os arquivos antes de enviar a{" "}
              <span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">
                {docLabel}
              </span>
            </>
          )}
        </p>
      </div>

      {files.length === 0 ? (
        <>
          <label
            htmlFor={inputId}
            className="group cursor-pointer rounded-2xl border-2 border-dashed border-[#D4A017]/30 bg-[#1a1a1a] p-8 text-center transition-all hover:border-[#D4A017]/60 hover:bg-[#D4A017]/5"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] shadow-[0_0_30px_rgba(212,160,23,0.4)] transition-shadow group-hover:shadow-[0_0_40px_rgba(212,160,23,0.6)]">
                <DropIcon className="h-8 w-8 text-black" />
              </div>
              <p className="font-medium text-[#F5F5F5]">Adicionar Arquivos</p>
              <p className="text-sm text-[#9CA3AF]">Câmera ou Galeria</p>
              <p className="text-[11px] text-[#6B7280]">
                Formatos aceitos: PNG, JPEG, GIF, WEBP, HEIC e PDF.
              </p>
            </div>
          </label>
          <Button
            type="button"
            disabled
            className="mt-8 h-11 w-full rounded-lg border border-[#D4A017]/10 bg-black/50 text-xs font-semibold text-[#6B7280]"
          >
            Selecione arquivos acima
          </Button>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-[#F5F5F5]">
              Seus Arquivos ({arquivosLabelFrom(files.length)})
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-full border-[#D4A017]/30 bg-black/40 text-[11px] font-semibold text-[#D4A017] hover:bg-[#D4A017]/10 hover:text-[#FFD700]"
              onClick={onAdicionarMais}
            >
              + Adicionar mais
            </Button>
          </div>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={file.name + file.lastModified + index}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#D4A017]/15 bg-black/60 px-4 py-3 text-xs text-[#F5F5F5] transition-colors hover:border-[#D4A017]/30"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]">
                    {isImage(file) ? (
                      <ImageIcon className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] sm:text-xs">{file.name}</p>
                    <p className="mt-0.5 text-[10px] text-[#6B7280]">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemover(index)}
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[#D4A017]/15 bg-black/50 text-[#9CA3AF] hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            className="mt-8 h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] disabled:opacity-70"
            disabled={isUploading || files.length === 0}
            onClick={onProcessar}
          >
            {isUploading ? "Processando..." : processarLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
            onClick={onVoltar}
            disabled={isUploading}
          >
            Voltar
          </Button>
        </>
      )}
    </div>
  );
};

export default UploadStep;
