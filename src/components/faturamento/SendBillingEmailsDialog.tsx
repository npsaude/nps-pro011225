import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle2, XCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface SendBillingEmailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faturamentoId: string;
  userEmail: string;
  userName: string;
  instituicaoCirurgiaNome?: string;
  instituicaoFaturamentoNome?: string;
  instituicoesDiferentes: boolean;
  onEmailsSent: () => void;
  onSkip: () => void;
}

type DialogState = "confirm" | "sending" | "success" | "error";

export const SendBillingEmailsDialog: React.FC<SendBillingEmailsDialogProps> = ({
  open,
  onOpenChange,
  faturamentoId,
  userEmail,
  userName,
  instituicaoCirurgiaNome,
  instituicaoFaturamentoNome,
  instituicoesDiferentes,
  onEmailsSent,
  onSkip,
}) => {
  const [state, setState] = useState<DialogState>("confirm");
  const [resultMessage, setResultMessage] = useState<string>("");
  const [emailsEnviados, setEmailsEnviados] = useState<string[]>([]);

  const handleSendEmails = async () => {
    setState("sending");

    try {
      const functionUrl =
        "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/send-billing-emails";

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          faturamentoId,
          userEmail,
          userName,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || "Erro ao enviar emails");
      }

      setEmailsEnviados(result.emails_enviados || []);
      setResultMessage(result.message || "Emails enviados com sucesso!");
      setState("success");
      showSuccess("Emails enviados com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar emails:", error);
      const message = error instanceof Error ? error.message : "Erro ao enviar emails";
      setResultMessage(message);
      setState("error");
      showError(message);
    }
  };

  const handleClose = () => {
    if (state === "success") {
      onEmailsSent();
    }
    setState("confirm");
    setResultMessage("");
    setEmailsEnviados([]);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#121212] border border-[#D4A017]/20 text-[#F5F5F5] max-w-md">
        {/* Estado: Confirmação */}
        {state === "confirm" && (
          <>
            <AlertDialogHeader>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_25px_rgba(212,160,23,0.35)]">
                <Mail className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="text-center text-lg font-semibold text-[#F5F5F5]">
                Enviar Emails de Faturamento
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm text-[#9CA3AF]">
                O sistema está pronto para enviar os documentos para as instituições.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="my-4 space-y-3">
              {instituicoesDiferentes ? (
                <>
                  <div className="rounded-xl bg-black/40 border border-[#D4A017]/15 p-3">
                    <p className="text-xs text-[#9CA3AF] mb-1">
                      Email para <span className="text-[#D4A017] font-medium">instituição da cirurgia</span>:
                    </p>
                    <p className="text-sm text-[#F5F5F5] font-medium">
                      {instituicaoCirurgiaNome || "N/A"}
                    </p>
                    <p className="text-[10px] text-[#6B7280] mt-1">
                      Informando que NÃO deve faturar
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-[#D4A017]/15 p-3">
                    <p className="text-xs text-[#9CA3AF] mb-1">
                      Email para <span className="text-[#D4A017] font-medium">instituição de faturamento</span>:
                    </p>
                    <p className="text-sm text-[#F5F5F5] font-medium">
                      {instituicaoFaturamentoNome || "N/A"}
                    </p>
                    <p className="text-[10px] text-[#6B7280] mt-1">
                      Solicitando faturamento
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-black/40 border border-[#D4A017]/15 p-3">
                  <p className="text-xs text-[#9CA3AF] mb-1">
                    Email para <span className="text-[#D4A017] font-medium">instituição de faturamento</span>:
                  </p>
                  <p className="text-sm text-[#F5F5F5] font-medium">
                    {instituicaoFaturamentoNome || "N/A"}
                  </p>
                  <p className="text-[10px] text-[#6B7280] mt-1">
                    Solicitando faturamento
                  </p>
                </div>
              )}

              <div className="rounded-xl bg-[#D4A017]/5 border border-[#D4A017]/20 p-3">
                <p className="text-[11px] text-[#9CA3AF]">
                  <span className="text-[#D4A017] font-medium">Anexos:</span> Guia de Autorização, Descrição Cirúrgica e Guia de Honorários (PDF)
                </p>
                <p className="text-[11px] text-[#9CA3AF] mt-1">
                  <span className="text-[#D4A017] font-medium">Cópia:</span> {userEmail}
                </p>
              </div>
            </div>

            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={handleSendEmails}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
              >
                <Send className="mr-2 h-4 w-4" />
                Sim, enviar emails
              </Button>
              <Button
                variant="outline"
                onClick={handleSkip}
                className="w-full h-11 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
              >
                Não, pular esta etapa
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {/* Estado: Enviando */}
        {state === "sending" && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_30px_rgba(212,160,23,0.35)]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">
              Enviando Emails...
            </h3>
            <p className="text-sm text-[#9CA3AF]">
              Aguarde enquanto os emails são enviados para as instituições.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D4A017]/20 bg-black/40 text-[#D4A017] animate-bounce"
                style={{ animationDelay: "0ms" }}
              >
                <Mail className="h-5 w-5" />
              </div>
              <div className="h-[2px] w-6 bg-gradient-to-r from-[#D4A017]/10 via-[#D4A017]/70 to-[#D4A017]/10" />
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D4A017]/20 bg-black/40 text-[#D4A017] animate-bounce"
                style={{ animationDelay: "140ms" }}
              >
                <Send className="h-5 w-5" />
              </div>
              <div className="h-[2px] w-6 bg-gradient-to-r from-[#D4A017]/10 via-[#D4A017]/70 to-[#D4A017]/10" />
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D4A017]/20 bg-black/40 text-[#D4A017] animate-bounce"
                style={{ animationDelay: "280ms" }}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-3 text-[11px] text-[#6B7280]">
              Preparando anexos e enviando via SMTP.
            </p>
          </div>
        )}

        {/* Estado: Sucesso */}
        {state === "success" && (
          <>
            <div className="py-6 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-500 border border-green-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">
                Emails Enviados!
              </h3>
              <p className="text-sm text-[#9CA3AF] mb-4">
                {resultMessage}
              </p>
              {emailsEnviados.length > 0 && (
                <div className="rounded-xl bg-black/40 border border-green-500/20 p-3 text-left">
                  <p className="text-xs text-[#9CA3AF] mb-2">Enviado para:</p>
                  {emailsEnviados.map((email, index) => (
                    <p key={index} className="text-sm text-[#F5F5F5]">
                      • {email}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <Button
                onClick={handleClose}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold"
              >
                Continuar
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {/* Estado: Erro */}
        {state === "error" && (
          <>
            <div className="py-6 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500 border border-red-500/30">
                <XCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">
                Erro ao Enviar
              </h3>
              <p className="text-sm text-[#9CA3AF]">
                {resultMessage}
              </p>
            </div>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={handleSendEmails}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold"
              >
                Tentar Novamente
              </Button>
              <Button
                variant="outline"
                onClick={handleSkip}
                className="w-full h-11 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
              >
                Pular e Continuar
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SendBillingEmailsDialog;