import React from "react";
import { Building2, CircleDollarSign, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFaturamentoFlow } from "../context/flow-context";

/**
 * Tela de preview da guia de honorários: exibe o HTML preenchido com controle
 * de zoom e ações de gerar/baixar PDF e concluir o faturamento. Usa goTo do
 * contexto para "Voltar"; o restante (estado de preview/PDF) chega por props.
 */
const ZOOM_STEP = 0.15;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.0;

type HonorariosPreviewStepProps = {
  hospitalNome: string;
  clinicaNome: string;
  html: string;
  previewRef: React.MutableRefObject<HTMLDivElement | null>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  pdfGerado: boolean;
  isGeneratingPdf: boolean;
  onPdfAction: () => void;
  onConcluir: () => void;
};

export const HonorariosPreviewStep: React.FC<HonorariosPreviewStepProps> = ({
  hospitalNome,
  clinicaNome,
  html,
  previewRef,
  zoom,
  setZoom,
  pdfGerado,
  isGeneratingPdf,
  onPdfAction,
  onConcluir,
}) => {
  const { goTo } = useFaturamentoFlow();

  const zoomOut = () =>
    setZoom((prev) => Math.max(ZOOM_MIN, Number((prev - ZOOM_STEP).toFixed(2))));
  const zoomIn = () =>
    setZoom((prev) => Math.min(ZOOM_MAX, Number((prev + ZOOM_STEP).toFixed(2))));

  return (
    <div className="flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-[#D4A017]/20 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F5]">Preview da guia de honorários</h2>
          <p className="text-xs text-[#9CA3AF]">Revise o documento antes de concluir o faturamento.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
            onClick={zoomOut}
          >
            - Zoom
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
            onClick={zoomIn}
          >
            + Zoom
          </Button>
          <span className="rounded-full border border-[#D4A017]/20 px-3 py-1 text-xs text-[#D4A017]">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      <div className="rounded-3xl border border-[#D4A017]/20 bg-black/40 p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[#9CA3AF]">
          <span className="flex items-center gap-2 rounded-full border border-[#D4A017]/20 px-3 py-1">
            <Building2 className="h-3.5 w-3.5 text-[#D4A017]" />
            Cirurgia: {hospitalNome || "Não informado"}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-[#D4A017]/20 px-3 py-1">
            <CircleDollarSign className="h-3.5 w-3.5 text-[#D4A017]" />
            Faturamento: {clinicaNome || "Não informado"}
          </span>
        </div>
        <div className="overflow-auto rounded-2xl bg-white p-4">
          <div
            ref={previewRef}
            className="origin-top transition-transform"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              width: `${100 / zoom}%`,
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
          onClick={() => goTo("pergunta_honorarios")}
        >
          Voltar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
          onClick={onPdfAction}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando PDF...
            </>
          ) : pdfGerado ? (
            <>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Gerar PDF
            </>
          )}
        </Button>
        <Button
          type="button"
          className="h-11 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-shadow hover:shadow-[0_0_30px_rgba(212,160,23,0.6)]"
          onClick={onConcluir}
        >
          Concluir faturamento
        </Button>
      </div>
    </div>
  );
};

export default HonorariosPreviewStep;
