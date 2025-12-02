import React, { useState } from "react";
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const selectedFiles = Array.from(event.target.files);

    const allowedFiles = selectedFiles.filter(
      (file) => file.type.startsWith("image/") || file.type === "application/pdf",
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
  };

  const handleGoToStep2 = () => {
    if (files.length === 0) {
      showError("Selecione pelo menos um arquivo para continuar.");
      return;
    }
    setStep(2);
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

  const progressWidth = step === 1 ? "50%" : "100%";

  return (
    <div className="relative flex min-h-screen w-full bg-slate-950 text-slate-50">
      {/* Fundo em gradiente médico */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#1F8A70_0,#020617_55%),radial-gradient(circle_at_100%_100%,#1D4E77_0,#020617_50%)] opacity-95" />

      <div className="flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Topo */}
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

        {/* Conteúdo */}
        <main className="flex flex-1 flex-col items-center justify-start">
          <Card className="w-full max-w-xl rounded-3xl border-emerald-500/35 bg-slate-950/90 text-slate-50 shadow-[0_18px_60px_rgba(6,95,70,0.75)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base sm:text-lg">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/90 text-white">
                    <Upload className="h-4 w-4" />
                  </span>
                  <span>Enviar Descrição Cirúrgica</span>
                </div>
                {files.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-200 ring-1 ring-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {files.length} arquivo(s)
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-emerald-100/80 sm:text-sm">
                Siga os passos para selecionar as imagens e/ou PDFs da descrição
                cirúrgica e enviar com segurança para o sistema.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 text-xs sm:text-sm">
              {/* Barra de progresso de passos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-emerald-100/80">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        step === 1
                          ? "bg-emerald-500 text-white"
                          : "bg-emerald-900 text-emerald-200"
                      }`}
                    >
                      1
                    </span>
                    <span>Selecionar arquivos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        step === 2
                          ? "bg-emerald-500 text-white"
                          : "bg-emerald-900 text-emerald-200"
                      }`}
                    >
                      2
                    </span>
                    <span>Revisar e enviar</span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-900/80">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 transition-all duration-500"
                    style={{ width: progressWidth }}
                  />
                </div>
              </div>

              {/* Passo 1: Selecionar arquivos */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-emerald-100">
                      Passo 1 — selecione os arquivos
                    </h2>
                    <p className="text-[11px] text-emerald-100/80">
                      Envie fotos (PNG, JPEG, GIF, WEBP) ou PDFs da descrição
                      cirúrgica, laudos e relatórios. Imagens serão usadas na
                      leitura automática; PDFs serão armazenados para consulta.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-dashed border-emerald-500/45 bg-slate-900/80 px-4 py-5 text-center">
                    <div className="mb-3 flex items-center justify-center gap-2 text-emerald-200">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950/80">
                        <ImageIcon className="h-4 w-4" />
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950/80">
                        <FileText className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100">
                      Clique no botão abaixo para selecionar as fotos e/ou PDFs
                      da descrição cirúrgica.
                    </p>
                    <p className="mt-1 text-[10px] text-emerald-200/75">
                      Imagens são usadas na leitura automática; PDFs ficam
                      armazenados para conferência futura.
                    </p>

                    <div className="mt-4 flex justify-center">
                      <label className="inline-flex cursor-pointer items-center">
                        <Input
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <span className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-white shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400">
                          <Upload className="h-3.5 w-3.5" />
                          Escolher arquivos
                        </span>
                      </label>
                    </div>

                    {files.length > 0 && (
                      <p className="mt-3 text-[11px] text-emerald-200">
                        {files.length} arquivo(s) selecionado(s). Clique em
                        &quot;Continuar&quot; para revisar e enviar.
                      </p>
                    )}
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-1 rounded-2xl bg-slate-900/90 p-3 text-[11px] text-emerald-100/90 ring-1 ring-emerald-500/30">
                      <p className="mb-1 font-semibold">
                        Arquivos selecionados ({files.length}):
                      </p>
                      <ul className="max-h-28 space-y-1 overflow-y-auto text-[11px]">
                        {files.map((file) => (
                          <li
                            key={file.name + file.lastModified}
                            className="truncate rounded-lg bg-slate-950/80 px-2 py-1"
                          >
                            {file.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleGoToStep2}
                    disabled={files.length === 0}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>Continuar para revisão</span>
                  </Button>
                </div>
              )}

              {/* Passo 2: Revisar e enviar */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-emerald-100">
                      Passo 2 — revisar e enviar
                    </h2>
                    <p className="text-[11px] text-emerald-100/80">
                      Confira os arquivos selecionados abaixo e clique em
                      &quot;Enviar arquivos&quot; para armazenar com segurança e
                      iniciar a leitura automática.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-900/90 p-4 ring-1 ring-emerald-500/30">
                    <p className="flex items-center gap-2 text-[11px] font-semibold text-emerald-100">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      Arquivos selecionados
                    </p>
                    <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-[11px] text-emerald-50/95">
                      {files.map((file) => (
                        <li
                          key={file.name + file.lastModified}
                          className="flex items-center justify-between rounded-lg bg-slate-950/80 px-2 py-1"
                        >
                          <span className="truncate">{file.name}</span>
                          <span className="ml-2 text-[10px] text-emerald-300/80">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 text-[10px] text-emerald-200/80">
                    <p>
                      • Os arquivos serão armazenados com segurança e vinculados
                      à sua conta de médico.
                    </p>
                    <p>
                      • A leitura automática utiliza apenas as imagens
                      suportadas; PDFs permanecem disponíveis para conferência e
                      faturamento.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading || files.length === 0}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Upload className="h-4 w-4" />
                    <span>
                      {isUploading
                        ? "Enviando arquivos..."
                        : "Enviar arquivos selecionados"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => setStep(1)}
                    className="flex w-full items-center justify-center gap-2 rounded-full border-emerald-500/40 bg-transparent text-xs font-semibold text-emerald-200 hover:bg-slate-900/70"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Voltar e alterar arquivos</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default MedicoUploadDescricaoCirurgica;