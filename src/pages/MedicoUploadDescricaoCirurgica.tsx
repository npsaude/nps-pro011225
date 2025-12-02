import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Image as ImageIcon, FileText } from "lucide-react";

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const selectedFiles = Array.from(event.target.files);

    // Aceitar imagens (para leitura automática) e PDFs (para armazenamento/consulta)
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

  const handleUpload = async () => {
    if (files.length === 0) {
      showError("Selecione pelo menos um arquivo para enviar.");
      return;
    }

    setIsUploading(true);
    const loadingId = showLoading("Enviando arquivos da descrição cirúrgica...");

    // Guardar os caminhos dos arquivos enviados para enviar à função Edge
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

      // Dispara a função Edge via fetch (fire-and-forget)
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

  return (
    <div className="relative flex min-h-screen w-full bg-slate-950 text-slate-50">
      {/* Fundo em gradiente médico, mobile-first */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#0f766e_0,#020617_55%),radial-gradient(circle_at_100%_100%,#22c55e_0,#020617_50%)] opacity-90" />

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
            <span>Envio de Descrição Cirúrgica</span>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 flex flex-col items-center justify-start">
          <Card className="w-full max-w-md rounded-3xl border-emerald-500/25 bg-slate-950/80 text-slate-50 shadow-[0_18px_60px_rgba(6,95,70,0.75)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/90 text-white">
                  <Upload className="h-4 w-4" />
                </span>
                <span>Enviar Descrição Cirúrgica</span>
              </CardTitle>
              <CardDescription className="text-xs text-emerald-100/80 sm:text-sm">
                Selecione as fotos (imagens do prontuário, laudos, relatórios)
                e/ou PDFs relacionados à cirurgia. Atualmente, apenas imagens
                (PNG, JPEG, GIF ou WEBP) são usadas para leitura automática; os
                PDFs ficam armazenados para consulta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-emerald-100/90">
                  Arquivos da descrição cirúrgica
                </label>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-500/40 bg-slate-900/60 px-4 py-5 text-center">
                  <div className="mb-2 flex items-center justify-center gap-2 text-emerald-200">
                    <ImageIcon className="h-4 w-4" />
                    <FileText className="h-4 w-4" />
                  </div>
                  <p className="text-[11px] text-emerald-100/80">
                    Toque no botão abaixo para selecionar fotos ou PDFs da
                    descrição cirúrgica.
                  </p>
                  <p className="mt-1 text-[10px] text-emerald-200/70">
                    Imagens (PNG, JPEG, GIF, WEBP) serão usadas na leitura
                    automática; PDFs serão armazenados para futura consulta.
                  </p>

                  <div className="mt-4">
                    <Input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="cursor-pointer border-emerald-500/40 bg-slate-950/70 text-[11px] file:mr-3 file:rounded-full file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-white hover:file:bg-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-1 rounded-2xl bg-slate-900/70 p-3 text-[11px] text-emerald-100/90">
                  <p className="mb-1 font-semibold">
                    Arquivos selecionados ({files.length}):
                  </p>
                  <ul className="max-h-32 space-y-1 overflow-y-auto text-[11px]">
                    {files.map((file) => (
                      <li
                        key={file.name + file.lastModified}
                        className="truncate rounded-lg bg-slate-950/70 px-2 py-1"
                      >
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || files.length === 0}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Upload className="h-4 w-4" />
                <span>
                  {isUploading
                    ? "Enviando arquivos..."
                    : "Enviar arquivos selecionados"}
                </span>
              </Button>

              <p className="mt-2 text-[10px] text-emerald-100/70">
                Os arquivos serão armazenados com segurança no sistema e
                vinculados à sua conta de médico para futura conferência e
                faturamento. A leitura automática usa apenas as imagens
                suportadas.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default MedicoUploadDescricaoCirurgica;