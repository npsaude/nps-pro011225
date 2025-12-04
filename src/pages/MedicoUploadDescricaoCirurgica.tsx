import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Building2,
  ChevronDown,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  showError,
  showSuccess,
  showLoading,
  dismissToast,
} from "@/utils/toast";

type ViewState = "start" | "hospital" | "upload" | "success";

const MedicoUploadDescricaoCirurgica: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hospitalId } = (location.state ?? {}) as { hospitalId?: string };

  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [medicoNome, setMedicoNome] = useState<string>("");
  const [view, setView] = useState<ViewState>("start");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedHospitalId, setSelectedHospitalId] = useState<
    string | undefined
  >(hospitalId);
  const [selectedHospitalName, setSelectedHospitalName] =
    useState<string>("");
  const [hospitaisMedico, setHospitaisMedico] = useState<
    { id: string; nome_fantasia: string }[]
  >([]);
  const [loadingHospitais, setLoadingHospitais] = useState(false);
  const [hospitalStepView, setHospitalStepView] = useState<
    "selector" | "list"
  >("selector");

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

  const carregarHospitaisDoMedico = async () => {
    setLoadingHospitais(true);
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData?.user) {
        showError("Faça login para selecionar o hospital.");
        navigate("/login-medico");
        return;
      }

      const email = authData.user.email;
      if (!email) {
        showError(
          "Não foi possível identificar seu e-mail. Tente novamente ou contate o suporte.",
        );
        return;
      }

      const { data: medico, error: medicoError } = await supabase
        .from("medicos")
        .select("hospitais_ids")
        .eq("email", email)
        .maybeSingle();

      if (medicoError) {
        throw new Error(
          medicoError.message ||
            "Não foi possível carregar os hospitais vinculados ao seu cadastro.",
        );
      }

      const hospitaisIds: string[] = (medico?.hospitais_ids as string[]) ?? [];

      if (!hospitaisIds.length) {
        setHospitaisMedico([]);
        return;
      }

      const { data: hospitaisData, error: hospitaisError } = await supabase
        .from("hospitais")
        .select("id, nome_fantasia")
        .in("id", hospitaisIds)
        .order("nome_fantasia", { ascending: true });

      if (hospitaisError) {
        throw new Error(
          hospitaisError.message ||
            "Não foi possível carregar a lista de hospitais.",
        );
      }

      const lista = (hospitaisData ?? []) as {
        id: string;
        nome_fantasia: string;
      }[];

      setHospitaisMedico(lista);

      const initialId = selectedHospitalId ?? hospitalId;
      if (initialId) {
        const match = lista.find((h) => h.id === initialId);
        if (match) {
          setSelectedHospitalId(match.id);
          setSelectedHospitalName(match.nome_fantasia);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os hospitais vinculados ao seu cadastro.";
      showError(message);
    } finally {
      setLoadingHospitais(false);
    }
  };

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

    // acumula arquivos novos com os já selecionados
    setFiles((prev) => [...prev, ...allowedFiles]);
    setStep(2);
    // limpa o input para permitir selecionar os mesmos arquivos novamente se necessário
    event.target.value = "";
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      showError("Selecione pelo menos um arquivo para enviar.");
      return;
    }

    if (!selectedHospitalId) {
      showError("Selecione o hospital onde a cirurgia foi realizada.");
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
            hospitalId: selectedHospitalId,
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

  const saudacao = medicoNome ? `Olá, Dr. ${medicoNome}.` : "Olá, médico.";

  const handleNovaDescricao = () => {
    setFiles([]);
    setStep(1);
    setView("start");
    setSelectedHospitalId(undefined);
    setSelectedHospitalName("");
    setHospitalStepView("selector");
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

  const handleAdicionarMais = () => {
    fileInputRef.current?.click();
  };

  const handleRemoverArquivo = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (files.length === 1) {
      setStep(1);
    }
  };

  const handleIniciarFluxo = () => {
    setView("hospital");
    setHospitalStepView("selector");
    if (!hospitaisMedico.length) {
      void carregarHospitaisDoMedico();
    }
  };

  const handleAbrirListaHospitais = () => {
    if (!loadingHospitais && hospitaisMedico.length > 0) {
      setHospitalStepView("list");
    }
  };

  const handleSelecionarHospital = (hospital: {
    id: string;
    nome_fantasia: string;
  }) => {
    setSelectedHospitalId(hospital.id);
    setSelectedHospitalName(hospital.nome_fantasia);
    setHospitalStepView("selector");
  };

  const handleFecharSelecaoHospital = () => {
    setView("start");
    setHospitalStepView("selector");
  };

  const handleVoltarListaParaSelector = () => {
    setHospitalStepView("selector");
  };

  const handleContinuarAposHospital = () => {
    if (!selectedHospitalId) {
      showError("Selecione um hospital para continuar.");
      return;
    }
    setView("upload");
  };

  return (
    <div className="relative flex min-h-screen w-full bg-slate-950 text-slate-50">
      {/* Fundo em gradiente médico */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,#1F8A70_0,#020617_55%),radial-gradient(circle_at_100%_100%,#1D4E77_0,#020617_50%)] opacity-95" />

      <div className="flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {/* Saudação e cabeçalho aparecem apenas nas etapas após seleção de hospital */}
        {(view === "upload" || view === "success") && (
          <>
            <p className="mb-3 text-sm font-semibold text-emerald-100 sm:text-base">
              {saudacao}
            </p>

            <header className="mb-5 flex items-center justify-between gap-3">
              <button
                type="button"
                className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-xs text-emerald-100 shadow-sm ring-1 ring-emerald-500/40 backdrop-blur"
                onClick={
                  view === "upload"
                    ? () => {
                        setView("hospital");
                        setStep(1);
                      }
                    : () => navigate("/medico/dashboard")
                }
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar</span>
              </button>

              <div className="flex items-center gap-2 rounded-2xl bg-slate-950/70 px-3 py-2 text-[11px] text-emerald-100/80 shadow-sm ring-1 ring-emerald-500/30 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>{view === "upload" ? "Passo 2/6" : "Envio de Desc. Cirúrgica"}</span>
              </div>
            </header>
          </>
        )}

        {/* Conteúdo principal */}
        <main className="flex flex-1 flex-col items-center justify-start">
          {view === "start" && (
            <div className="mt-8 flex w-full max-w-sm flex-col items-center text-center">
              <p className="mb-2 text-sm font-semibold text-emerald-300">
                {saudacao}
              </p>
              <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                Nova Descrição Cirúrgica
              </h1>
              <p className="mt-3 max-w-xs text-sm text-slate-200">
                Vamos começar o envio da sua Descrição Cirúrgica. É rápido e
                seguro.
              </p>

              <button
                type="button"
                onClick={handleIniciarFluxo}
                className="mt-10 flex h-52 w-52 items-center justify-center rounded-full bg-emerald-500 text-center text-slate-50 shadow-[0_0_90px_rgba(16,185,129,0.85)] ring-8 ring-emerald-500/40 transition-transform hover:translate-y-0.5 sm:h-56 sm:w-56 motion-safe:animate-soft-pulse"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600/95 text-slate-50 shadow-inner shadow-emerald-700/80">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="text-[15px] font-semibold">
                    Iniciar Agora
                  </span>
                </div>
              </button>

              <p className="mt-8 text-[11px] text-slate-400">
                Seus dados são criptografados ponta a ponta.
              </p>
            </div>
          )}

          {view === "hospital" && (
            <div className="mt-10 flex w-full max-w-sm flex-col items-center">
              {hospitalStepView === "selector" ? (
                <div className="w-full rounded-[1.75rem] bg-slate-950/95 px-6 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.9)] ring-1 ring-slate-800">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-50">
                        {medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        Escolha qual o hospital a cirurgia foi realizada.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleFecharSelecaoHospital}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleAbrirListaHospitais}
                    disabled={
                      loadingHospitais || (!hospitaisMedico.length && !selectedHospitalId)
                    }
                    className="flex w-full items-center justify-between rounded-2xl border border-emerald-500/40 bg-slate-900 px-4 py-3 text-left text-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/80">
                          Hospital selecionado
                        </span>
                        <span className="text-sm font-semibold">
                          {selectedHospitalName ||
                            (loadingHospitais
                              ? "Carregando hospitais..."
                              : hospitaisMedico.length
                                ? "Selecionar Hospital"
                                : "Nenhum hospital vinculado")}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-300" />
                  </button>

                  <button
                    type="button"
                    onClick={handleContinuarAposHospital}
                    disabled={!selectedHospitalId}
                    className={`mt-6 w-full rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      selectedHospitalId
                        ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                        : "bg-slate-800 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Continuar
                  </button>
                </div>
              ) : (
                <div className="w-full rounded-[1.75rem] bg-slate-950/95 px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.9)] ring-1 ring-slate-800">
                  <div className="mb-5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleVoltarListaParaSelector}
                      className="flex items-center gap-2 text-xs text-slate-300 hover:text-slate-100"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Voltar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFecharSelecaoHospital}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {loadingHospitais && (
                      <p className="text-xs text-slate-300">
                        Carregando hospitais onde você atua...
                      </p>
                    )}

                    {!loadingHospitais &&
                      hospitaisMedico.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => handleSelecionarHospital(h)}
                          className="flex w-full items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-left text-slate-50 hover:bg-slate-800"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                            <Building2 className="h-4 w-4" />
                          </span>
                          <span className="text-sm font-medium">
                            {h.nome_fantasia}
                          </span>
                        </button>
                      ))}

                    {!loadingHospitais && !hospitaisMedico.length && (
                      <p className="text-xs text-slate-400">
                        Não encontramos hospitais vinculados ao seu cadastro.
                        Entre em contato com o administrador.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === "upload" && (
            <div className="mt-2 flex w-full max-w-md flex-col">
              {/* Input de arquivos centralizado para ser usado tanto no card quanto em "+ Adicionar mais" */}
              <Input
                id="files-upload"
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />

              {/* Barra de progresso simples do passo */}
              <div className="mb-4">
                <div className="h-1 w-full rounded-full bg-slate-800">
                  <div className="h-1 w-1/3 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* Título com Dr(a) + nome e hospital */}
              <div className="mb-6">
                <h1 className="text-lg font-semibold text-slate-50 sm:text-xl">
                  {medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}
                </h1>
                <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                  {selectedHospitalName
                    ? `Hospital ${selectedHospitalName}. ${
                        files.length === 0
                          ? "Toque abaixo para tirar fotos ou escolher arquivos."
                          : "Confira os arquivos antes de enviar a Descrição Cirúrgica."
                      }`
                    : files.length === 0
                      ? "Toque abaixo para tirar fotos ou escolher arquivos."
                      : "Confira os arquivos antes de enviar a Descrição Cirúrgica."}
                </p>
              </div>

              {files.length === 0 ? (
                <>
                  {/* Estado inicial: card grande para adicionar arquivos */}
                  <label
                    htmlFor="files-upload"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-400/70 bg-slate-950/80 px-6 py-10 text-center text-xs text-emerald-100/90 transition-colors hover:bg-slate-900"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-emerald-50">
                      Adicionar Arquivos
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-100/80">
                      Câmera ou Galeria
                    </p>
                    <p className="mt-3 text-[10px] text-emerald-100/70">
                      Formatos aceitos: PNG, JPEG, GIF, WEBP e PDF.
                    </p>
                  </label>

                  <Button
                    type="button"
                    disabled
                    className="mt-8 h-11 w-full rounded-full bg-slate-900 text-xs font-semibold text-slate-400"
                  >
                    Selecione arquivos acima
                  </Button>
                </>
              ) : (
                <>
                  {/* Estado com arquivos: lista para conferência + botão adicionar mais */}
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-200">
                      Seus Arquivos ({files.length})
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full border-emerald-500/60 bg-slate-950 text-[11px] font-semibold text-emerald-200 hover:bg-slate-900"
                      onClick={handleAdicionarMais}
                    >
                      + Adicionar mais
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={file.name + file.lastModified + index}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/90 px-4 py-3 text-xs text-slate-100 ring-1 ring-slate-800"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                            {isImage(file) ? (
                              <ImageIcon className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] sm:text-xs">
                              {file.name}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverArquivo(index)}
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    className="mt-8 h-11 w-full rounded-full bg-emerald-500 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-70"
                    disabled={isUploading || files.length === 0}
                    onClick={handleUpload}
                  >
                    {isUploading ? "Enviando..." : "Continuar Envio"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 text-xs text-emerald-100 hover:bg-transparent hover:text-emerald-300"
                    onClick={handleNovaDescricao}
                    disabled={isUploading}
                  >
                    Voltar para Nova Descrição
                  </Button>
                </>
              )}
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