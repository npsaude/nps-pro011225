import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

type ViewState = "start" | "upload" | "success";

const MedicoUploadDescricaoCirurgica: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hospitalId } = (location.state ?? {}) as { hospitalId?: string };

  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [medicoNome, setMedicoNome] = useState<string>("");
  const [view, setView] = useState<ViewState>("start");

  // Garante que a tela só seja acessada após escolha de hospital
  useEffect(() => {
    if (!hospitalId) {
      showError("Selecione um hospital para enviar a descrição cirúrgica.");
      navigate("/medico/dashboard");
    }
  }, [hospitalId, navigate]);

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
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user) {
        showError("Faça login novamente para enviar arquivos.");
        navigate("/login-medico");
        return;
      }

      const userId = userData.user.id;
      // Nome do bucket deve ser exatamente igual ao que aparece no Supabase (NPS-pro)
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
        "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-descricao-cirurgica";

      try {
        await fetch(functionUrl, {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify({
            userId,
            files: uploadedFilePaths.map((path) => ({ path })),
            // hospitalId está disponível aqui caso você queira usá-lo depois na função
            hospitalId,
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
    setView("start");
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
          {view === "start" && (
            <div className="mt-4 flex w-full max-w-md flex-col items-stretch">
              <Card className="relative overflow-hidden rounded-[2.2rem] border-emerald-500/25 bg-slate-950/90 text-center shadow-[0_30px_80px_rgba(16,185,129,0.5)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.45)_0,transparent_55%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.4)_0,transparent_55%)] opacity-90" />
                <div className="relative z-10 px-6 py-7 sm:px-8 sm:py-8">
                  <CardHeader className="mb-4 space-y-2 px-0">
                    <CardTitle className="text-lg font-semibold text-slate-50 sm:text-xl">
                      Nova Descrição
                    </CardTitle>
                    <CardDescription className="text-xs text-emerald-50/90 sm:text-sm">
                      Toque para adicionar fotos ou documentos da cirurgia.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-5 px-0">
                    <button
                      type="button"
                      onClick={() => setView("upload")}
                      className="mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-[2rem] bg-gradient-to-b from-emerald-400 to-emerald-500 text-emerald-50 shadow-[0_28px_65px_rgba(16,185,129,0.85)] transition-transform hover:translate-y-0.5 sm:h-44 sm:w-44"
                    >
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/95 text-slate-50 shadow-inner shadow-emerald-700/70">
                        <Upload className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-semibold">
                        Nova Descrição
                      </span>
                    </button>

                    <p className="px-2 text-xs text-emerald-50/90 sm:text-[13px]">
                      Você pode enviar fotos da guia, laudos ou PDFs completos
                      da cirurgia.
                    </p>

                    <div className="mt-3 rounded-full border border-emerald-400/40 bg-slate-950/80 px-4 py-2 text-center text-[11px] text-emerald-100/90">
                      Seus dados são criptografados ponta a ponta.
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>
          )}

          {view === "upload" && (
            <div className="mt-2 flex w-full max-w-md flex-col gap-4">
              <Card className="rounded-3xl border-slate-800 bg-slate-950/90 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-base text-slate-50 sm:text-lg">
                    Enviar arquivos da cirurgia
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-300 sm:text-sm">
                    Selecione fotos nítidas ou PDFs completos dos documentos da
                    cirurgia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label
                    htmlFor="files"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-400/60 bg-slate-900/70 px-4 py-6 text-center text-xs text-emerald-100/90 transition-colors hover:bg-slate-900"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-emerald-50">
                      Toque para selecionar fotos ou PDFs
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-100/80">
                      Formatos aceitos: PNG, JPEG, GIF, WEBP e PDF.
                    </p>
                    <Input
                      id="files"
                      type="file"
                      multiple
                      className="mt-3 hidden"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                    />
                  </label>

                  <div className="flex items-center justify-between rounded-2xl bg-slate-900/80 px-3 py-2 text-[11px] text-slate-200">
                    <span className="font-medium text-emerald-100">
                      Arquivos selecionados:
                    </span>
                    <span className="text-emerald-300">{arquivosLabel}</span>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-2 rounded-2xl bg-slate-900/70 p-3 text-xs">
                      {files.map((file) => (
                        <div
                          key={file.name + file.lastModified}
                          className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-800/80 text-emerald-300">
                              {isImage(file) ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </span>
                            <span className="line-clamp-1 text-[11px] sm:text-xs">
                              {file.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-300">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    className="mt-1 w-full rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    disabled={isUploading || files.length === 0}
                    onClick={handleUpload}
                  >
                    {isUploading ? "Enviando..." : "Enviar descrição cirúrgica"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full rounded-2xl text-xs text-emerald-100 hover:bg-slate-900"
                    onClick={handleNovaDescricao}
                    disabled={isUploading}
                  >
                    Voltar para Nova Descrição
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {view === "success" && (
            <div className="mt-6 flex w-full max-w-md flex-col items-stretch">
              <Card className="rounded-3xl border-emerald-500/30 bg-slate-950/95 text-center shadow-[0_22px_60px_rgba(16,185,129,0.7)]">
                <CardContent className="space-y-4 px-6 py-7">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-50 sm:text-lg">
                    Descrição enviada!
                  </h2>
                  <p className="text-xs text-emerald-50/90 sm:text-sm">
                    Recebemos seus arquivos e a análise da descrição cirúrgica
                    foi iniciada. Você poderá acompanhar o status na área{" "}
                    <span className="font-semibold">
                      &quot;Minhas descrições cirúrgicas&quot;
                    </span>
                    .
                  </p>
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      type="button"
                      className="w-full rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      onClick={handleNovaDescricao}
                    >
                      Enviar nova descrição
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-2xl border-emerald-500/40 bg-slate-950/90 text-xs text-emerald-100 hover:bg-slate-900"
                      onClick={() => navigate("/medico/descricao-cirurgica")}
                    >
                      Ver minhas descrições cirúrgicas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MedicoUploadDescricaoCirurgica;