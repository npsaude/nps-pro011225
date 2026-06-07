import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
  AlertTriangle,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MEDICO_LOGO_URL } from "@/constants/medico-brand";
import { showError, showSuccess } from "@/utils/toast";
import { compressFiles } from "@/utils/image-compression";
import MedicoFloatingNav from "@/components/medico/MedicoFloatingNav";

type ViewState = "upload" | "processing" | "duplicate" | "not_owner" | "success";

interface GuiaExistente {
  id: string;
  numero_guia_prestador: string;
  nome_beneficiario: string | null;
  data_inicio_atendimento: string | null;
  valor_total_geral: string | number | null;
  created_at: string;
}

const isPdfFile = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

type UploadItem = {
  data: Blob;
  contentType: string;
  suggestedName: string;
};

const MedicoUploadSadtAcompanhamento: React.FC = () => {
  const navigate = useNavigate();

  const [files, setFiles] = useState<File[]>([]);
  const [view, setView] = useState<ViewState>("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [guiaExistente, setGuiaExistente] = useState<GuiaExistente | null>(null);
  const [numeroDuplicado, setNumeroDuplicado] = useState<string>("");
  const [nomeBeneficiarioDuplicado, setNomeBeneficiarioDuplicado] = useState<string>("");
  const [notOwnerInfo, setNotOwnerInfo] = useState<{
    profissional_nome_guia: string | null;
    profissional_conselho_guia: string | null;
    nome_beneficiario: string | null;
    numero_guia_prestador: string | null;
  } | null>(null);
  // Paths já enviados ao storage — reutilizados se o usuário confirmar envio duplicado
  const uploadedPathsRef = useRef<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pdfToPngUploadItems = async (pdfFile: File): Promise<UploadItem[]> => {
    const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
      .default as string;

    GlobalWorkerOptions.workerSrc = workerUrl;

    const data = await pdfFile.arrayBuffer();
    const loadingTask = getDocument({ data });
    const pdf = await loadingTask.promise;

    const baseName = sanitizeFileName(
      pdfFile.name.replace(/\.pdf$/i, "") || "documento",
    );

    const items: UploadItem[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await (page.render({ canvasContext: ctx, viewport, canvas } as any)
        .promise as Promise<void>);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) {
            reject(new Error("Falha ao converter página do PDF em imagem."));
            return;
          }
          resolve(b);
        }, "image/png");
      });

      items.push({
        data: blob,
        contentType: "image/png",
        suggestedName: `${baseName}_p${pageNum}.png`,
      });
    }

    return items;
  };

  const expandFilesToUploadItems = async (inputFiles: File[]) => {
    const items: UploadItem[] = [];

    for (const file of inputFiles) {
      if (isPdfFile(file)) {
        const pdfItems = await pdfToPngUploadItems(file);
        items.push(...pdfItems);
        continue;
      }

      items.push({
        data: file,
        contentType: file.type || "application/octet-stream",
        suggestedName: file.name,
      });
    }

    return items;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const selectedFiles = Array.from(event.target.files);

    const allowedFiles = selectedFiles.filter(
      (file) => file.type.startsWith("image/") || file.type === "application/pdf",
    );

    if (allowedFiles.length === 0) {
      setFiles([]);
      showError(
        "Nenhum arquivo válido foi selecionado. Envie imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
      );
      return;
    }

    compressFiles(allowedFiles).then((compressedFiles) => {
      setFiles((prev) => [...prev, ...compressedFiles]);
    });
    event.target.value = "";
  };

  const handleRemoverArquivo = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdicionarMais = () => {
    fileInputRef.current?.click();
  };

  // Faz upload dos arquivos para o storage e chama a edge function
  const processarEnvio = async (forceInsert = false, forceOwnership = false) => {
    setIsUploading(true);
    setView("processing");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        showError("Faça login novamente.");
        navigate("/login");
        return;
      }

      const userId = userData.user.id;
      const bucketName = "NPS-pro";

      // Reutilizar paths já enviados se for reenvio forçado (duplicata confirmada)
      let uploadedFilePaths: string[] = forceInsert
        ? uploadedPathsRef.current
        : [];

      if (!forceInsert) {
        const uploadItems = await expandFilesToUploadItems(files);
        if (uploadItems.length === 0) {
          throw new Error("Nenhum arquivo válido foi gerado para envio.");
        }

        for (const item of uploadItems) {
          const safeName = sanitizeFileName(item.suggestedName);
          const timestamp = Date.now();
          const filePath = `sadt_acompanhamento/${userId}/${timestamp}-${safeName}`;

          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, item.data, {
              cacheControl: "3600",
              upsert: false,
              contentType: item.contentType,
            });

          if (uploadError) {
            throw new Error(`Falha ao enviar "${safeName}": ${uploadError.message}`);
          }

          uploadedFilePaths.push(filePath);
        }

        // Guardar paths para possível reenvio forçado
        uploadedPathsRef.current = uploadedFilePaths;
      }

      const functionUrl =
        "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-sadt-acompanhamento";

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          files: uploadedFilePaths.map((path) => ({ path })),
          forceInsert,
          forceOwnership,
        }),
      });

      let responseJson: any = null;
      try {
        responseJson = await response.json();
      } catch {
        // ignore
      }

      if (!response.ok || responseJson?.error) {
        const errorMessage =
          responseJson?.error ??
          "Arquivos enviados, mas houve erro ao processar a SADT.";
        throw new Error(errorMessage);
      }

      // Guia não pertence ao médico — mostrar aviso
      if (responseJson?.not_owner === true) {
        setNotOwnerInfo({
          profissional_nome_guia: responseJson.profissional_nome_guia ?? null,
          profissional_conselho_guia: responseJson.profissional_conselho_guia ?? null,
          nome_beneficiario: responseJson.nome_beneficiario ?? null,
          numero_guia_prestador: responseJson.numero_guia_prestador ?? null,
        });
        setView("not_owner");
        setIsUploading(false);
        return;
      }

      // Duplicata detectada — mostrar aviso
      if (responseJson?.duplicate === true) {
        setGuiaExistente(responseJson.guia_existente ?? null);
        setNumeroDuplicado(responseJson.numero_guia_prestador ?? "");
        setNomeBeneficiarioDuplicado(responseJson.nome_beneficiario ?? "");
        setView("duplicate");
        setIsUploading(false);
        return;
      }

      showSuccess("SADT processada com sucesso!");
      setFiles([]);
      uploadedPathsRef.current = [];
      setView("success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível processar a SADT.";
      showError(message);
      setView("upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = () => processarEnvio(false, false);

  const handleConfirmarDuplicata = () => processarEnvio(true, true);

  const handleCancelarDuplicata = () => {
    uploadedPathsRef.current = [];
    setGuiaExistente(null);
    setNumeroDuplicado("");
    setNomeBeneficiarioDuplicado("");
    setFiles([]);
    setView("upload");
  };

  // Confirmar importação mesmo sem ser dono da guia
  const handleConfirmarNotOwner = () => processarEnvio(false, true);

  const handleCancelarNotOwner = () => {
    uploadedPathsRef.current = [];
    setNotOwnerInfo(null);
    setFiles([]);
    setView("upload");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const [year, month, day] = dateStr.split("T")[0].split("-");
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (val: string | number | null) => {
    if (val === null || val === undefined) return "—";
    const n = Number(val);
    if (isNaN(n)) return "—";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const totalArquivos = files.length;
  const arquivosLabel =
    totalArquivos === 0
      ? "Nenhum arquivo"
      : totalArquivos === 1
        ? "1 arquivo"
        : `${totalArquivos} arquivos`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0b0b] pb-32 text-[#F5F5F5]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.10)_0,#0b0b0b_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-[#121212]/80" />

      <div className="relative z-10 flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-xs text-[#F5F5F5] shadow-sm border border-[#D4A017]/20 hover:border-[#D4A017]/40 transition-colors"
            onClick={() => navigate("/medico/sadt-acompanhamento")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2 rounded-full bg-[#D4A017]/10 px-3 py-1.5 text-[11px] text-[#D4A017] border border-[#D4A017]/25">
            <span className="h-2 w-2 rounded-full bg-[#D4A017] shadow-[0_0_8px_rgba(212,160,23,0.8)]" />
            <span>Acompanhamento de SADT</span>
          </div>
        </header>

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
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />

              <div className="mb-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] flex items-center justify-center shadow-[0_0_20px_rgba(212,160,23,0.4)]">
                    <img
                      src={MEDICO_LOGO_URL}
                      alt="Logo Conmedic"
                      className="h-7 w-7 object-contain"
                      loading="eager"
                    />
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] bg-clip-text text-transparent">
                    CONMEDIC
                  </span>
                </div>

                <h1 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl">
                  Enviar Guia SADT
                </h1>
                <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
                  Envie imagens ou PDF da guia SADT para a IA extrair e salvar os dados.
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
                    {isUploading ? "Enviando..." : "Processar SADT"}
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
                Analisando Guia SADT
              </h2>
              <p className="mt-2 max-w-xs text-center text-[11px] text-[#9CA3AF] sm:text-xs">
                O sistema está extraindo as informações. Isso pode levar alguns
                segundos...
              </p>

              <div className="mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-black/50 border border-[#D4A017]/10">
                <div className="h-1.5 w-1/2 rounded-full bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] animate-[pulse_1.8s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {/* TELA: GUIA NÃO PERTENCE AO MÉDICO */}
          {view === "not_owner" && (
            <div className="mt-2 flex w-full max-w-md flex-col items-center">
              <div className="w-full rounded-2xl bg-black/70 backdrop-blur-xl border border-red-500/30 px-6 py-7 shadow-[0_0_40px_rgba(239,68,68,0.10)]">
                {/* Ícone de aviso */}
                <div className="mb-5 flex flex-col items-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#F5F5F5]">
                    Guia não pertence a você
                  </h2>
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    O profissional identificado nesta guia é diferente do seu cadastro. Deseja importar mesmo assim?
                  </p>
                </div>

                {/* Dados da guia */}
                <div className="mb-6 rounded-xl bg-black/50 border border-red-500/15 px-4 py-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400/70 mb-3">
                    Profissional identificado na guia
                  </p>
                  {notOwnerInfo?.profissional_nome_guia && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9CA3AF]">Nome</span>
                      <span className="font-semibold text-[#F5F5F5] text-right max-w-[60%]">
                        {notOwnerInfo.profissional_nome_guia}
                      </span>
                    </div>
                  )}
                  {notOwnerInfo?.profissional_conselho_guia && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9CA3AF]">Nº Conselho</span>
                      <span className="font-semibold text-[#F5F5F5]">
                        {notOwnerInfo.profissional_conselho_guia}
                      </span>
                    </div>
                  )}
                  {notOwnerInfo?.nome_beneficiario && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9CA3AF]">Beneficiário</span>
                      <span className="font-semibold text-[#F5F5F5] text-right max-w-[55%]">
                        {notOwnerInfo.nome_beneficiario}
                      </span>
                    </div>
                  )}
                  {notOwnerInfo?.numero_guia_prestador && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[#9CA3AF]">Nº Guia</span>
                      <span className="font-semibold text-[#F5F5F5]">
                        {notOwnerInfo.numero_guia_prestador}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botões */}
                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
                    onClick={handleConfirmarNotOwner}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
                    ) : (
                      "Sim, importar mesmo assim"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                    onClick={handleCancelarNotOwner}
                    disabled={isUploading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TELA DE DUPLICATA */}
          {view === "duplicate" && (
            <div className="mt-2 flex w-full max-w-md flex-col items-center">
              <div className="w-full rounded-2xl bg-black/70 backdrop-blur-xl border border-amber-500/30 px-6 py-7 shadow-[0_0_40px_rgba(212,160,23,0.12)]">
                {/* Ícone de aviso */}
                <div className="mb-5 flex flex-col items-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30">
                    <AlertTriangle className="h-8 w-8 text-amber-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#F5F5F5]">
                    Guia já enviada anteriormente
                  </h2>
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    Esta guia já existe no sistema. Deseja enviar novamente?
                  </p>
                </div>

                {/* Dados da guia duplicada */}
                <div className="mb-6 rounded-xl bg-black/50 border border-[#D4A017]/15 px-4 py-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#D4A017]/70 mb-3">
                    Registro existente
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9CA3AF]">Nº Guia Prestador</span>
                    <span className="font-semibold text-[#F5F5F5]">{numeroDuplicado || "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9CA3AF]">Beneficiário</span>
                    <span className="font-semibold text-[#F5F5F5] text-right max-w-[55%]">
                      {guiaExistente?.nome_beneficiario || nomeBeneficiarioDuplicado || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9CA3AF]">Data atendimento</span>
                    <span className="font-semibold text-[#F5F5F5]">
                      {formatDate(guiaExistente?.data_inicio_atendimento ?? null)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9CA3AF]">Valor total</span>
                    <span className="font-semibold text-[#D4A017]">
                      {formatCurrency(guiaExistente?.valor_total_geral ?? null)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9CA3AF]">Enviada em</span>
                    <span className="font-semibold text-[#F5F5F5]">
                      {guiaExistente?.created_at
                        ? formatDate(guiaExistente.created_at)
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
                    onClick={handleConfirmarDuplicata}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                    ) : (
                      "Sim, enviar mesmo assim"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                    onClick={handleCancelarDuplicata}
                    disabled={isUploading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TELA DE SUCESSO */}
          {view === "success" && (
            <div className="flex w-full max-w-md flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#D4A017]/10 border border-[#D4A017]/25">
                <span className="text-4xl">✓</span>
              </div>
              <h2 className="text-lg font-semibold">SADT processada</h2>
              <p className="mt-2 text-sm text-[#9CA3AF]">
                Os dados foram extraídos e salvos com sucesso.
              </p>

              <Button
                type="button"
                className="mt-8 h-11 w-full max-w-sm rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold"
                onClick={() => navigate("/medico/sadt-acompanhamento")}
              >
                Ver SADTs
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
                onClick={() => setView("upload")}
              >
                Enviar outra SADT
              </Button>
            </div>
          )}
        </main>
      </div>

      <MedicoFloatingNav />
    </div>
  );
};

export default MedicoUploadSadtAcompanhamento;
