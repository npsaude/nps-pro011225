import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle2,
  FileCheck,
  Loader2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { MEDICO_LOGO_URL } from "@/constants/medico-brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  showError,
  showSuccess,
  showLoading,
  dismissToast,
} from "@/utils/toast";

type ViewState = "upload" | "processing" | "success";

const MedicoUploadGuiaAutorizacao: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { faturamentoId } = (location.state ?? {}) as { faturamentoId?: string };

  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [view, setView] = useState<ViewState>("upload");
  const [medicoNome, setMedicoNome] = useState<string>("");
  const [dadosExtraidos, setDadosExtraidos] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Verifica se tem faturamentoId
  useEffect(() => {
    if (!faturamentoId) {
      showError("Faturamento não encontrado. Inicie o fluxo novamente.");
      navigate("/medico/descricao-cirurgica/enviar");
    }
  }, [faturamentoId, navigate]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const selectedFiles = Array.from(event.target.files);

    const allowedFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/")
    );
    const ignoredCount = selectedFiles.length - allowedFiles.length;

    if (ignoredCount > 0) {
      showError(
        "Alguns arquivos foram ignorados por não serem imagens. Envie apenas imagens (PNG, JPEG, GIF, WEBP)."
      );
    }

    if (allowedFiles.length === 0) {
      setFiles([]);
      showError(
        "Nenhum arquivo válido foi selecionado. Envie imagens (PNG, JPEG, GIF, WEBP)."
      );
      return;
    }

    setFiles((prev) => [...prev, ...allowedFiles]);
    event.target.value = "";
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      showError("Selecione pelo menos uma imagem para enviar.");
      return;
    }

    if (!faturamentoId) {
      showError("Faturamento não encontrado. Inicie o fluxo novamente.");
      return;
    }

    setIsUploading(true);
    setView("processing");

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
      const bucketName = "NPS-pro";

      // Upload das imagens para o bucket
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const timestamp = Date.now();
        const filePath = `guia_autorizacao_cirurgia/${userId}/${timestamp}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            `Falha ao enviar "${file.name}": ${uploadError.message}`
          );
        }

        uploadedFilePaths.push(filePath);
      }

      // Chamar a Edge Function para processar as imagens
      const functionUrl =
        "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-guia-autorizacao";

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          faturamentoId,
          files: uploadedFilePaths.map((path) => ({ path })),
        }),
      });

      let responseJson: any = null;
      try {
        responseJson = await response.json();
      } catch {
        // se não veio JSON, seguimos só com o status HTTP
      }

      if (!response.ok || responseJson?.error) {
        const errorMessage =
          responseJson?.error ??
          "Arquivos enviados, mas houve erro ao processar a guia de autorização.";
        throw new Error(errorMessage);
      }

      setDadosExtraidos(responseJson?.dados_extraidos ?? null);
      showSuccess("Guia de autorização processada com sucesso!");
      setFiles([]);
      setView("success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível processar a guia de autorização.";
      showError(message);
      setView("upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAdicionarMais = () => {
    fileInputRef.current?.click();
  };

  const handleRemoverArquivo = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNovaGuia = () => {
    setFiles([]);
    setView("upload");
    setDadosExtraidos(null);
  };

  const saudacao = medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),";
  const totalArquivos = files.length;
  const arquivosLabel =
    totalArquivos === 0
      ? "Nenhum arquivo"
      : totalArquivos === 1
        ? "1 arquivo"
        : `${totalArquivos} arquivos`;

  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#F5F5F5] relative overflow-hidden">
      {/* Fundo premium */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.10)_0,#0b0b0b_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-[#121212]/80" />

      <div className="relative z-10 flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-xs text-[#F5F5F5] shadow-sm border border-[#D4A017]/20 hover:border-[#D4A017]/40 transition-colors"
            onClick={() => navigate("/medico/descricao-cirurgica/enviar")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2 rounded-full bg-[#D4A017]/10 px-3 py-1.5 text-[11px] text-[#D4A017] border border-[#D4A017]/25">
            <span className="h-2 w-2 rounded-full bg-[#D4A017] shadow-[0_0_8px_rgba(212,160,23,0.8)]" />
            <span>Guia de Autorização</span>
          </div>
        </header>

        {/* Barra de progresso */}
        <div className="mb-5 w-full max-w-md self-center">
          <div className="h-1 w-full rounded-full bg-black/40 border border-[#D4A017]/10">
            <div
              className="h-1 rounded-full bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] transition-all duration-300"
              style={{ width: view === "success" ? "100%" : "50%" }}
            />
          </div>
        </div>

        {/* Conteúdo principal */}
        <main className="flex flex-1 flex-col items-center justify-start">
          {/* TELA DE UPLOAD */}
          {view === "upload" && (
            <div className="mt-2 flex w-full max-w-md flex-col">
              <Input
                id="files-upload"
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />

              <div className="mb-6">
                <h1 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl">
                  {saudacao}
                </h1>
                <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
                  Faça upload das imagens da Guia de Autorização de Cirurgia.
                </p>
                <p className="mt-1 text-[11px] text-[#6B7280] sm:text-xs">
                  Obs: Tire várias imagens com os detalhes dos campos da mesma
                  guia para melhor análise da IA
                </p>
              </div>

              {files.length === 0 ? (
                <>
                  <label
                    htmlFor="files-upload"
                    className="bg-[#1a1a1a] border-2 border-dashed border-[#D4A017]/30 rounded-2xl p-8 hover:border-[#D4A017]/60 hover:bg-[#D4A017]/5 transition-all cursor-pointer group text-center"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] flex items-center justify-center shadow-[0_0_30px_rgba(212,160,23,0.4)] group-hover:shadow-[0_0_40px_rgba(212,160,23,0.6)] transition-shadow">
                        <Upload className="h-8 w-8 text-black" />
                      </div>
                      <p className="text-[#F5F5F5] font-medium">
                        Adicionar Arquivos
                      </p>
                      <p className="text-[#9CA3AF] text-sm">Câmera ou Galeria</p>
                      <p className="text-[#6B7280] text-[11px]">
                        Formatos aceitos: PNG, JPEG, GIF, WEBP e PDF.
                      </p>
                    </div>
                  </label>

                  <Button
                    type="button"
                    disabled
                    className="mt-8 h-11 w-full rounded-lg bg-black/50 text-xs font-semibold text-[#6B7280] border border-[#D4A017]/10"
                  >
                    Selecione arquivos acima
                  </Button>
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#F5F5F5]">
                      Seus Arquivos ({arquivosLabel})
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full border-[#D4A017]/30 bg-black/40 text-[11px] font-semibold text-[#D4A017] hover:bg-[#D4A017]/10 hover:text-[#FFD700]"
                      onClick={handleAdicionarMais}
                    >
                      + Adicionar mais
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={file.name + file.lastModified + index}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-black/60 px-4 py-3 text-xs text-[#F5F5F5] border border-[#D4A017]/15 hover:border-[#D4A017]/30 transition-colors"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
                            <ImageIcon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] sm:text-xs">
                              {file.name}
                            </p>
                            <p className="mt-0.5 text-[10px] text-[#6B7280]">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverArquivo(index)}
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-black/50 text-[#9CA3AF] border border-[#D4A017]/15 hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    className="mt-8 h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] hover:scale-[1.01] transition-all duration-300 disabled:opacity-70"
                    disabled={isUploading || files.length === 0}
                    onClick={handleUpload}
                  >
                    {isUploading ? "Enviando..." : "Processar Guia"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
                    onClick={() => setFiles([])}
                    disabled={isUploading}
                  >
                    Limpar seleção
                  </Button>
                </>
              )}
            </div>
          )}

          {/* TELA DE PROCESSAMENTO */}
          {view === "processing" && (
            <div className="flex w-full max-w-md flex-col items-center justify-center py-16">
              <div className="relative mb-7 flex h-24 w-24 items-center justify-center rounded-[32px] bg-gradient-to-br from-[#FFD700] via-[#D4A017] to-[#B8860B] shadow-[0_0_60px_rgba(212,160,23,0.35)]">
                <div className="absolute inset-1 rounded-[26px] bg-black/60 backdrop-blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#121212] border border-[#D4A017]/20 shadow-[0_10px_40px_rgba(0,0,0,0.65)]">
                  <Loader2 className="h-8 w-8 text-[#D4A017] animate-spin" />
                </div>
              </div>

              <h2 className="text-base font-semibold text-[#F5F5F5] sm:text-lg">
                Analisando Guia de Autorização
              </h2>
              <p className="mt-2 text-[11px] text-[#9CA3AF] sm:text-xs text-center max-w-xs">
                A IA está extraindo as informações das imagens. Isso pode levar
                alguns segundos...
              </p>

              {/* Barra de progresso animada */}
              <div className="mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-black/50 border border-[#D4A017]/10">
                <div className="h-1.5 w-1/2 rounded-full bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] animate-[pulse_1.8s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {/* TELA DE SUCESSO */}
          {view === "success" && (
            <div className="mt-6 flex w-full max-w-md flex-col items-stretch">
              <Card className="rounded-2xl border border-[#D4A017]/20 bg-black/70 backdrop-blur-xl text-center shadow-[0_0_40px_rgba(212,160,23,0.12)]">
                <CardContent className="space-y-6 px-6 py-8">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_30px_rgba(212,160,23,0.35)]">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl">
                      Guia Processada!
                    </h2>
                    <p className="text-xs text-[#9CA3AF] sm:text-sm">
                      Os dados da guia de autorização foram extraídos e salvos
                      com sucesso.
                    </p>
                  </div>

                  {/* Resumo dos dados extraídos */}
                  {dadosExtraidos?.faturamento && (
                    <div className="mt-4 rounded-xl bg-black/50 p-4 text-left border border-[#D4A017]/15">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#D4A017] mb-3">
                        Dados Extraídos
                      </p>
                      <div className="space-y-2 text-xs text-[#9CA3AF]">
                        {dadosExtraidos.faturamento.nome_paciente && (
                          <p>
                            <span className="text-[#F5F5F5]">Paciente:</span>{" "}
                            {dadosExtraidos.faturamento.nome_paciente}
                          </p>
                        )}
                        {dadosExtraidos.faturamento.operadora_nome && (
                          <p>
                            <span className="text-[#F5F5F5]">Operadora:</span>{" "}
                            {dadosExtraidos.faturamento.operadora_nome}
                          </p>
                        )}
                        {dadosExtraidos.faturamento.numero_guia_operadora && (
                          <p>
                            <span className="text-[#F5F5F5]">Nº Guia:</span>{" "}
                            {dadosExtraidos.faturamento.numero_guia_operadora}
                          </p>
                        )}
                        {dadosExtraidos.faturamento.hospital_solicitado && (
                          <p>
                            <span className="text-[#F5F5F5]">Hospital:</span>{" "}
                            {dadosExtraidos.faturamento.hospital_solicitado}
                          </p>
                        )}
                        {dadosExtraidos.procedimentos?.length > 0 && (
                          <p>
                            <span className="text-[#F5F5F5]">Procedimentos:</span>{" "}
                            {dadosExtraidos.procedimentos.length} encontrado(s)
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      type="button"
                      className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
                      onClick={() => navigate("/medico/dashboard")}
                    >
                      Ir para o Início
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                      onClick={handleNovaGuia}
                    >
                      Enviar Outra Guia
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

export default MedicoUploadGuiaAutorizacao;
