import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  showError,
  showSuccess,
  showLoading,
  dismissToast,
} from "@/utils/toast";

const MedicoUploadDescricaoCirurgica: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [medicoNome, setMedicoNome] = useState<string>("");
  const [view, setView] = useState<"upload" | "success">("upload");

  // Carrega o nome do médico logado para exibir na saudação
  useEffect(() => {
    const carregarNomeMedico = async () => {
      const { data: authData } = await supabase.auth.getUser();

      const email = authData.user?.email;
      if (!email) return;

      const { data, error } = await supabase
        .from("usuarios_sistema")
        .select("nome")
        .eq("email", email)
        .maybeSingle();

      if (!error && data?.nome) {
        const primeiroNome = (data.nome as string).split(" ")[0];
        setMedicoNome(primeiroNome);
      }
    };

    void carregarNomeMedico();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const selectedFiles = Array.from(event.target.files);

    const allowedFiles = selectedFiles.filter(
      (file) =>
        file.type.startsWith("image/") || file.type === "application/pdf",
    );
    const ignoredCount = selectedFiles.length - allowedFiles.length;

    if (ignoredCount > 0) {
      showError(
        "Alguns arquivos foram ignorados por não serem imagens ou PDFs. Envie apenas imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
      );
    }

    if (allowedFiles.length === 0) {
      setFiles([]);
      showError(
        "Nenhum arquivo válido foi selecionado. Envie imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
      );
      return;
    }

    setFiles(allowedFiles);
    setStep(2); // assim que selecionar arquivos, avança para a etapa de revisão
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      showError("Selecione pelo menos um arquivo para enviar.");
      return;
    }

    setIsUploading(true);
    const loadingId = showLoading("Enviando arquivos da descrição cirúrgica...");

    const uploadedFilePaths: string[] = [];

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        showError("Faça login novamente para enviar arquivos.");
        navigate("/login-medico");
        return;
      }

      const userId = userData.user.id;
      const bucketName = "NPS-pro";

      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const timestamp = Date.now();
        const filePath = `descricao_cirurgica/${userId}/${timestamp}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            `Falha ao enviar "${file.name}": ${uploadError.message}`,
          );
        }

        uploadedFilePaths.push(filePath);
      }

      // Chama a edge function que processa a descrição cirúrgica
      const functionUrl =
        "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/functions";

      try {
        await fetch(functionUrl, {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify({
            userId,
            files: uploadedFilePaths.map((path) => ({ path })),
          }),
        });
      } catch {
        throw new Error(
          "Arquivos enviados, mas não foi possível iniciar a análise automática. Tente novamente mais tarde.",
        );
      }

      showSuccess(
        "Arquivos enviados e análise da descrição cirúrgica iniciada com sucesso.",
      );
      setFiles([]);
      setStep(1);
      setView("success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível enviar os arquivos.";
      showError(message);
    } finally {
      dismissToast(loadingId);
      setIsUploading(false);
    }
  };

  const saudacao = medicoNome ? `Olá, ${medicoNome}.` : "Olá, médico.";

  const handleNovaDescricao = () => {
    setFiles([]);
    setStep(1);
    setView("upload");
  };

  const totalArquivos = files.length;
  const arquivosLabel =
    totalArquivos === 0
      ? "Nenhum arquivo"
      : totalArquivos === 1
      ? "1 arquivo"
      : `${totalArquivos} arquivos`;

  // Auxiliar simples para distinguir ícone/label
  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className="relative flex min-h-screen w-full bg-slate-950 text-slate-50">
      {/* Fundo em gradiente médico */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#1F8A70_0,#020617_55%),radial-gradient(circle_at_100%_100%,#1D4E77_0,#020617_50%)] opacity-95" />

      <div className="flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Saudação no topo */}
        <p className="mb-3 text-sm font-semibold text-emerald-100 sm:text-base">
          {saudacao}
        </p>

        {/* Cabeçalho simples */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-xs text-emerald-100 shadow-sm ring-1 ring-emerald-500/40 backdrop-blur"
            onClick={() => navigate("/medico/dashboard")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-[11px] text-emerald-100/80 shadow-sm ring-1 ring-emerald-500/30 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Envio de Desc. Cirúrgica</span>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="flex flex-1 flex-col items-center justify-start">
          {view === "upload" && (
            <>
              {/* Etapa 1 - Nova Descrição */}
              {step === 1 && (
                <Card className="w-full max-w-xs rounded-3xl border-emerald-500/35 bg-slate-950/90 text-slate-50 shadow-[0_18px_60px_rgba(6,95,70,0.75)]">
                  <CardHeader className="pb-3 text-center">
                    <CardTitle className="text-base sm:text-lg">
                      Nova Descrição
                    </CardTitle>
                    <CardDescription className="text-xs text-emerald-100/80 sm:text-sm">
                      Toque para adicionar fotos ou documentos da cirurgia.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 text-xs sm:text-sm">
                    <div className="flex justify-center">
                      <label className="flex h-40 w-40 cursor-pointer flex-col items-center justify-center rounded-[32px] bg-gradient-to-b from-emerald-500 to-emerald-400 text-center text-sm font-semibold text-white shadow-[0_25px_60px_rgba(16,185,129,0.7)]">
                        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/80 shadow-inner">
                          <Upload className="h-6 w-6" />
                        </span>
                        <span>Nova Descrição</span>
                        <Input
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <p className="mt-1 text-center text-[10px] text-emerald-100/80">
                      Você pode enviar fotos da guia, laudos ou PDFs completos
                      da cirurgia.
                    </p>

                    <div className="mt-6 flex items-center justify-center">
                      <span className="rounded-full bg-slate-900/80 px-4 py-1 text-[10px] text-emerald-100/80 ring-1 ring-slate-700">
                        Seus dados são criptografados ponta a ponta.
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Etapa 2 - Revisão dos arquivos */}
              {step === 2 && (
                <Card className="w-full max-w-md rounded-3xl border-emerald-500/35 bg-slate-950/90 text-slate-50 shadow-[0_18px_60px_rgba(6,95,70,0.75)]">
                  <CardHeader className="pb-2">
                    <div className="mb-2 flex items-center justify-between text-xs text-emerald-100/90">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1 text-[11px] text-emerald-100 ring-1 ring-slate-700/80 hover:bg-slate-900/80"
                        onClick={() => setStep(1)}
                      >
                        <ArrowLeft className="h-3 w-3" />
                        <span>Voltar</span>
                      </button>
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] text-emerald-200 ring-1 ring-emerald-500/40">
                        {arquivosLabel}
                      </span>
                    </div>
                    <CardTitle className="text-sm sm:text-base">
                      Revisão
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-1 text-xs sm:text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      {files.map((file) => (
                        <div
                          key={file.name + file.lastModified}
                          className="flex flex-col items-stretch rounded-2xl bg-slate-900 ring-1 ring-slate-700/80"
                        >
                          <div className="relative flex h-32 items-center justify-center rounded-2xl bg-slate-900/90">
                            {isImage(file) ? (
                              <ImageIcon className="h-10 w-10 text-emerald-300/80" />
                            ) : (
                              <FileText className="h-10 w-10 text-emerald-300/80" />
                            )}
                          </div>
                          <div className="flex items-center justify-between px-2.5 py-2">
                            <span className="line-clamp-2 text-[10px] text-emerald-100">
                              {file.name}
                            </span>
                            <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-emerald-200">
                              {isImage(file) ? "JPEG" : "PDF"}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Slot para adicionar mais arquivos */}
                      <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600/80 bg-slate-900/60 text-[11px] text-emerald-100/80">
                        <span className="mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800/80 text-emerald-300">
                          +
                        </span>
                        <span>Adicionar</span>
                        <Input
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <Button
                      type="button"
                      onClick={handleUpload}
                      disabled={isUploading || files.length === 0}
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 text-xs font-semibold text-white shadow-[0_18px_45px_rgba(16,185,129,0.7)] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Upload className="h-4 w-4" />
                      <span>
                        {isUploading ? "Enviando..." : "Enviar Agora"}
                      </span>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Tela de sucesso */}
          {view === "success" && (
            <Card className="w-full max-w-md rounded-3xl border-emerald-500/35 bg-slate-950/90 text-slate-50 shadow-[0_18px_60px_rgba(6,95,70,0.75)]">
              <CardHeader className="pb-3 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_35px_rgba(16,185,129,0.9)]">
                  <CheckCircle2 className="h-9 w-9 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold sm:text-xl">
                  Enviado com sucesso!
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-emerald-100/85 sm:text-sm">
                  Sua descrição cirúrgica já está sendo processada pelo
                  sistema.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pb-6 text-xs sm:text-sm">
                <Button
                  type="button"
                  onClick={handleNovaDescricao}
                  className="flex h-11 w-full items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(16,185,129,0.7)] hover:bg-emerald-400"
                >
                  Nova Descrição
                </Button>

                <button
                  type="button"
                  onClick={() => navigate("/medico/dashboard")}
                  className="w-full text-center text-xs font-semibold text-emerald-100 underline-offset-2 hover:underline"
                >
                  Voltar ao Dashboard
                </button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default MedicoUploadDescricaoCirurgica;