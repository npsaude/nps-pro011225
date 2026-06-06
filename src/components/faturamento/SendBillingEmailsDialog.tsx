import React, { useEffect, useMemo, useRef, useState } from "react";
import { edgeFunctionUrl } from "@/config/supabase";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
  ArrowLeft,
  Check,
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { authHeaders } from "@/integrations/supabase/auth-header";
import { ATUACAO_LABEL, reconhecerAtuacao, type Atuacao } from "@/utils/atuacao";

interface SendBillingEmailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faturamentoId: string;
  userEmail: string;
  userName: string;
  userCrm?: string;
  descricaoCirurgicaTexto?: string | null;
  instituicaoCirurgiaNome?: string;
  instituicaoFaturamentoNome?: string;
  instituicoesDiferentes: boolean;
  /** Quando true, pula a tela de atuação e vai direto para confirmação de envio */
  skipAtuacaoScreen?: boolean;
  onEmailsSent: () => void;
  onSkip: () => void;
}

type Screen =
  | "atuacao"
  | "confirm-send"
  | "sending"
  | "success"
  | "error";

type TeamInfo = {
  cirurgiao_principal_nome: string | null;
  cirurgiao_principal_crm: string | null;
  auxiliar1_nome: string | null;
  auxiliar1_crm: string | null;
  auxiliar2_nome: string | null;
  auxiliar2_crm: string | null;
  auxiliar3_nome: string | null;
  auxiliar3_crm: string | null;
  anestesista_nome: string | null;
  anestesista_crm: string | null;
};

export const SendBillingEmailsDialog: React.FC<SendBillingEmailsDialogProps> = ({
  open,
  onOpenChange,
  faturamentoId,
  userEmail,
  userName,
  userCrm,
  descricaoCirurgicaTexto,
  instituicaoCirurgiaNome,
  instituicaoFaturamentoNome,
  instituicoesDiferentes,
  skipAtuacaoScreen = false,
  onEmailsSent,
  onSkip,
}) => {
  const [screen, setScreen] = useState<Screen>("atuacao");
  const [resultMessage, setResultMessage] = useState<string>("");
  const [emailsEnviados, setEmailsEnviados] = useState<string[]>([]);
  const [atuacao, setAtuacao] = useState<Atuacao | "">("");
  const [atuacaoReconhecida, setAtuacaoReconhecida] = useState<Atuacao | null>(null);
  const [requiresAtuacao, setRequiresAtuacao] = useState(() => {
    const norm = String(descricaoCirurgicaTexto ?? "").trim();
    return norm.length > 0;
  });

  // Track whether the dry-run already ran for this open session
  const dryRunDoneRef = useRef(false);

  const atuacaoLabel = useMemo(() => {
    if (!atuacao) return "";
    return ATUACAO_LABEL[atuacao];
  }, [atuacao]);

  useEffect(() => {
    if (!open) {
      // Reset when dialog closes
      dryRunDoneRef.current = false;
      return;
    }

    // Only run once per open session
    if (dryRunDoneRef.current) return;
    dryRunDoneRef.current = true;

    setScreen("atuacao");
    setResultMessage("");
    setEmailsEnviados([]);
    setAtuacaoReconhecida(null);

    let cancelled = false;

    const run = async () => {
      try {
        // Se skipAtuacaoScreen=true, verificar se já tem atuou_como salvo no banco
        if (skipAtuacaoScreen) {
          const { data: fat } = await supabase
            .from("faturamentos")
            .select("atuou_como")
            .eq("id", faturamentoId)
            .maybeSingle();

          if (cancelled) return;

          if (fat?.atuou_como) {
            setAtuacao(fat.atuou_como as Atuacao);
          }

          // Pular direto para confirmação de envio
          setScreen("confirm-send");
          return;
        }

        const functionUrl =
          edgeFunctionUrl("send-billing-emails");

        const response = await fetch(functionUrl, {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({
            faturamentoId,
            userEmail,
            userName,
            userCrm,
            descricaoCirurgicaTexto,
            atuacao: null,
            dryRun: true,
          }),
        });

        const result = await response.json();

        if (cancelled) return;

        if (typeof result?.requires_atuacao === "boolean") {
          setRequiresAtuacao(result.requires_atuacao);
        }

        const reconhecida = (result?.atuacao_reconhecida ?? null) as Atuacao | null;
        setAtuacaoReconhecida(reconhecida);

        if (reconhecida) {
          setAtuacao(reconhecida);
        } else {
          const team = (result?.team ?? null) as TeamInfo | null;

          if (team && userCrm) {
            const guess = reconhecerAtuacao({
              descricaoCirurgicaTexto,
              userNome: userName,
              userCrm,
              cirurgiaoNome: team.cirurgiao_principal_nome,
              cirurgiaoCrm: team.cirurgiao_principal_crm,
              auxiliar1Nome: team.auxiliar1_nome,
              auxiliar1Crm: team.auxiliar1_crm,
              auxiliar2Nome: team.auxiliar2_nome,
              auxiliar2Crm: team.auxiliar2_crm,
              auxiliar3Nome: team.auxiliar3_nome,
              auxiliar3Crm: team.auxiliar3_crm,
              anestesistaNome: team.anestesista_nome,
              anestesistaCrm: team.anestesista_crm,
            });

            if (guess) setAtuacao(guess);
          }
        }

        // Se não precisa atuação, pula direto para a confirmação de envio.
        if (typeof result?.requires_atuacao === "boolean" && !result.requires_atuacao) {
          setScreen("confirm-send");
        }
      } catch {
        // Sem pré-seleção
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, faturamentoId, userEmail, userName, userCrm, descricaoCirurgicaTexto, skipAtuacaoScreen]);

  const isAtuacaoReconhecida = !!atuacaoReconhecida;

  const handleConfirmAtuacao = async () => {
    if (requiresAtuacao && !atuacao) {
      showError("Selecione sua atuação na cirurgia para continuar.");
      return;
    }

    // Salva a atuação no faturamento já na confirmação (sempre que houver atuação selecionada).
    if (atuacao) {
      const { error } = await supabase
        .from("faturamentos")
        .update({
          atuou_como: atuacao,
          updated_at: new Date().toISOString(),
        })
        .eq("id", faturamentoId);

      if (error) {
        showError("Não foi possível salvar sua atuação. Tente novamente.");
        return;
      }
    }

    setScreen("confirm-send");
  };

  const handleSendEmails = async () => {
    if (requiresAtuacao && !atuacao) {
      showError("Confirme sua atuação na cirurgia antes de enviar.");
      setScreen("atuacao");
      return;
    }

    setScreen("sending");

    try {
      const functionUrl =
        edgeFunctionUrl("send-billing-emails");

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          faturamentoId,
          userEmail,
          userName,
          userCrm,
          descricaoCirurgicaTexto,
          atuacao: atuacao || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || "Erro ao enviar emails");
      }

      setEmailsEnviados(result.emails_enviados || []);
      setResultMessage(result.message || "Emails enviados com sucesso!");
      setScreen("success");
      showSuccess("Emails enviados com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar emails:", error);
      const message = error instanceof Error ? error.message : "Erro ao enviar emails";
      setResultMessage(message);
      setScreen("error");
      showError(message);
    }
  };

  const handleClose = () => {
    if (screen === "success") {
      onEmailsSent();
    }
    setScreen("atuacao");
    setResultMessage("");
    setEmailsEnviados([]);
    setAtuacao("");
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  const atuacoes = Object.keys(ATUACAO_LABEL) as Atuacao[];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#121212] border border-[#D4A017]/20 text-[#F5F5F5] max-w-md">
        {/* Tela 1: Atuação */}
        {screen === "atuacao" && (
          <>
            <AlertDialogHeader>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_25px_rgba(212,160,23,0.35)]">
                <Check className="h-7 w-7" />
              </div>

              {!requiresAtuacao ? (
                <>
                  <AlertDialogTitle className="text-center text-lg font-semibold text-[#F5F5F5]">
                    Sua atuação na cirurgia
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-center text-sm text-[#9CA3AF]">
                    Confirme como você atuou para registrar no faturamento e usar no email.
                  </AlertDialogDescription>
                </>
              ) : isAtuacaoReconhecida ? (
                <>
                  <AlertDialogTitle className="text-center text-lg font-semibold text-[#F5F5F5]">
                    Confirme abaixo em qual área você atuou nessa cirurgia.
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-center text-sm text-[#9CA3AF]" />
                </>
              ) : (
                <>
                  <AlertDialogTitle className="text-center text-lg font-semibold text-[#F5F5F5]">
                    Sua atuação na cirurgia não foi reconhecida.
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-center text-sm text-[#9CA3AF]">
                    Isso significa que a descrição cirúrgica pode estar trocada ou o CRM nela preenchida
                    é diferente do seu CRM. Se você realmente atuou nessa cirurgia, escolha abaixo em
                    qual área você atuou.
                  </AlertDialogDescription>
                </>
              )}
            </AlertDialogHeader>

            <div className="my-4 space-y-3">
              {!requiresAtuacao ? (

                <div className="rounded-xl bg-black/40 border border-[#D4A017]/15 p-3">
                  <p className="text-sm text-[#9CA3AF]">
                    Não foi encontrada descrição cirúrgica anexada; a confirmação de atuação não é
                    necessária.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-black/40 border border-[#D4A017]/15 p-3">
                  <p className="text-xs text-[#9CA3AF] mb-3">
                    Selecione apenas uma opção
                    {atuacaoLabel ? (
                      <span className="text-[#D4A017]"> (reconhecida: {atuacaoLabel})</span>
                    ) : (
                      <span className="text-[#D4A017]"> (não reconhecida)</span>
                    )}
                  </p>

                  <div className="space-y-2">
                    {atuacoes.map((k) => {
                      const checked = atuacao === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            setAtuacao((prev) => (prev === k ? "" : k));
                          }}
                          className="w-full rounded-lg border border-[#D4A017]/15 bg-black/30 px-3 py-2 text-left hover:bg-[#D4A017]/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                setAtuacao(v ? k : "");
                              }}
                              className="border-[#D4A017]/40 data-[state=checked]:bg-[#D4A017] data-[state=checked]:text-black"
                            />
                            <div>
                              <p className="text-sm text-[#F5F5F5] font-medium">
                                {ATUACAO_LABEL[k]}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={handleConfirmAtuacao}
                disabled={requiresAtuacao && !atuacao}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow disabled:opacity-60 disabled:hover:shadow-[0_0_20px_rgba(212,160,23,0.4)]"
              >
                Confirmar e continuar
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

        {/* Tela 2: Confirmação de envio */}
        {screen === "confirm-send" && (
          <>
            <AlertDialogHeader>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_25px_rgba(212,160,23,0.35)]">
                <Mail className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="text-center text-lg font-semibold text-[#F5F5F5]">
                Enviar Emails de Faturamento
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-sm text-[#9CA3AF]">
                Confira as instituições e confirme se deseja enviar.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="my-4 space-y-3">
              {requiresAtuacao && atuacaoLabel && (
                <div className="rounded-xl bg-black/40 border border-[#D4A017]/15 p-3">
                  <p className="text-xs text-[#9CA3AF]">Sua atuação confirmada</p>
                  <p className="text-sm text-[#F5F5F5] font-medium">{atuacaoLabel}</p>
                </div>
              )}

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
                  <p className="text-[10px] text-[#6B7280] mt-1">Solicitando faturamento</p>
                </div>
              )}

              <div className="rounded-xl bg-[#D4A017]/5 border border-[#D4A017]/20 p-3">
                <p className="text-[11px] text-[#9CA3AF]">
                  <span className="text-[#D4A017] font-medium">Anexos:</span> Guia de Autorização,
                  Descrição Cirúrgica e Guia de Honorários (PDF)
                </p>
                <p className="text-[11px] text-[#9CA3AF] mt-1">
                  <span className="text-[#D4A017] font-medium">Cópia:</span> {userEmail}
                </p>
              </div>
            </div>

            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <div className="flex w-full gap-2">
                <Button
                  variant="outline"
                  onClick={() => setScreen("atuacao")}
                  className="h-11 flex-1 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleSendEmails}
                  className="h-11 flex-1 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Sim, enviar
                </Button>
              </div>
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
        {screen === "sending" && (
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
        {screen === "success" && (
          <>
            <div className="py-6 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-500 border border-green-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">
                Emails Enviados!
              </h3>
              <p className="text-sm text-[#9CA3AF] mb-4">{resultMessage}</p>
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
        {screen === "error" && (
          <>
            <div className="py-6 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-500 border border-red-500/30">
                <XCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">
                Erro ao Enviar
              </h3>
              <p className="text-sm text-[#9CA3AF]">{resultMessage}</p>
            </div>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                onClick={() => setScreen("confirm-send")}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold"
              >
                Voltar
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