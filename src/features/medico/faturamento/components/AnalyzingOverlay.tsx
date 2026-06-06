import React from "react";
import { Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/**
 * Overlay exibido enquanto um documento é enviado e analisado pela IA.
 * Extraído da página MedicoUploadDescricaoCirurgica sem alterar o comportamento.
 */

export type AnalyzingDocType = "solicitacao" | "guia" | "descricao" | "honorarios";
export type AnalyzingStep = "uploading" | "analyzing" | "saving";

type AnalyzingOverlayProps = {
  open: boolean;
  progress: number;
  step: AnalyzingStep;
  docType: AnalyzingDocType;
};

const getDocTitle = (docType: AnalyzingDocType): string => {
  switch (docType) {
    case "solicitacao":
      return "Guia de Solicitação";
    case "guia":
      return "Guia de Autorização de Cirurgia";
    case "descricao":
      return "Descrição Cirúrgica";
    case "honorarios":
      return "Guia de Faturamento de Honorários";
    default:
      return "";
  }
};

const getStepDescription = (step: AnalyzingStep, docType: AnalyzingDocType): string => {
  if (step === "uploading") {
    switch (docType) {
      case "solicitacao":
        return "Fazendo upload das imagens da guia de solicitação.";
      case "guia":
        return "Fazendo upload das imagens da guia de autorização.";
      case "descricao":
        return "Fazendo upload das imagens da descrição cirúrgica.";
      case "honorarios":
        return "Fazendo upload das imagens da guia de faturamento de honorários.";
      default:
        return "";
    }
  } else if (step === "analyzing") {
    switch (docType) {
      case "solicitacao":
        return "O sistema está extraindo as informações da guia de solicitação.";
      case "guia":
        return "O sistema está extraindo as informações da guia.";
      case "descricao":
        return "O sistema está extraindo as informações da descrição cirúrgica.";
      case "honorarios":
        return "O sistema está extraindo as informações da guia de faturamento de honorários.";
      default:
        return "";
    }
  }
  return "Gravando os dados extraídos no sistema.";
};

export const AnalyzingOverlay: React.FC<AnalyzingOverlayProps> = ({
  open,
  progress,
  step,
  docType,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <Card className="w-full max-w-md rounded-3xl border border-[#D4A017]/20 bg-[#111111] text-[#F5F5F5] shadow-2xl">
        <CardContent className="p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D4A017]/15 text-[#FFD700]">
            <Brain className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">{getDocTitle(docType)}</h3>
          <p className="mt-2 text-sm text-[#9CA3AF]">{getStepDescription(step, docType)}</p>
          <Progress value={progress} className="mt-5 h-2 bg-white/10" />
          <p className="mt-3 text-xs text-[#D4A017]">{progress}% concluído</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyzingOverlay;
