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
  CircleDollarSign,
  Signature,
  Send,
  Mail,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { MEDICO_LOGO_URL } from "@/constants/medico-brand";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
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
  const [autoFillDialogOpen, setAutoFillDialogOpen] = useState(false);
  const [showFillingScreen, setShowFillingScreen] = useState(false);
  const [fillingProgress, setFillingProgress] = useState(0);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [showSigningScreen, setShowSigningScreen] = useState(false);
  const [showSignedScreen, setShowSignedScreen] = useState(false);
  const [showSendingScreen, setShowSendingScreen] = useState(false);
  const [sendingStep, setSendingStep] = useState<1 | 2>(1);

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

  // Clínica para faturamento
  const [selectedClinicaId, setSelectedClinicaId] = useState<
    string | undefined
  >(undefined);
  const [selectedClinicaName, setSelectedClinicaName] =
    useState<string>("");
  const [clinicasMedico, setClinicasMedico] = useState<
    { id: string; nome_fantasia: string }[]
  >([]);
  const [loadingClinicas, setLoadingClinicas] = useState(false);
  const [clinicaStepView, setClinicaStepView] = useState<"selector" | "list">(
    "selector",
  );

  // Checkbox "Mesmo hospital que foi realizada a cirurgia"
  const [useSameAsHospital, setUseSameAsHospital] = useState(false);

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

      // Lista de hospitais vem de public.clinicas (tipo_unidade = HOSPITAL)
      const { data: hospitaisData, error: hospitaisError } = await supabase
        .from("clinicas")
        .select("id, nome_fantasia")
        .eq("tipo_unidade", "HOSPITAL")
        .order("nome_fantasia", { ascending: true });

      if (hospitaisError) {
        throw new Error(
          hospitaisError.message || "Não foi possível carregar a lista de hospitais.",
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
          : "Não foi possível carregar a lista de hospitais.";
      showError(message);
    } finally {
      setLoadingHospitais(false);
    }
  };

  const carregarClinicasDoMedico = async () => {
    setLoadingClinicas(true);
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData?.user) {
        showError("Faça login para selecionar a clínica de faturamento.");
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
        .select("clinicas_ids")
        .eq("email", email)
        .maybeSingle();

      if (medicoError) {
        throw new Error(
          medicoError.message ||
            "Não foi possível carregar as clínicas vinculadas ao seu cadastro.",
        );
      }

      const clinicasIds: string[] = (medico?.clinicas_ids as string[]) ?? [];

      if (!clinicasIds.length) {
        setClinicasMedico([]);
        return;
      }

      // Busca clínicas vinculadas ao médico (tipo_unidade = CLINICA)
      const { data: clinicasData, error: clinicasError } = await supabase
        .from("clinicas")
        .select("id, nome_fantasia")
        .in("id", clinicasIds)
        .eq("tipo_unidade", "CLINICA")
        .order("nome_fantasia", { ascending: true });

      if (clinicasError) {
        throw new Error(
          clinicasError.message ||
            "Não foi possível carregar a lista de clínicas.",
        );
      }

      const lista = (clinicasData ?? []) as {
        id: string;
        nome_fantasia: string;
      }[];

      setClinicasMedico(lista);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as clínicas vinculadas ao seu cadastro.";
      showError(message);
    } finally {
      setLoadingClinicas(false);
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

    setFiles((prev) => [...prev, ...allowedFiles]);
    setStep(2);
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

    if (!selectedClinicaId) {
      showError("Selecione a clínica pela qual o serviço será faturado.");
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
        "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-descricao-cirurgica";

      // Chama a Edge Function e valida a resposta; se houver erro lá, mostramos no app
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          files: uploadedFilePaths.map((path) => ({ path })),
          hospitalId: selectedHospitalId,
          clinicaId: selectedClinicaId,
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
          "Arquivos enviados, mas houve erro ao criar a descrição cirúrgica no servidor.";
        throw new Error(errorMessage);
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
      setShowSendingScreen(false);
    }
  };

  // Simula o preenchimento automático: barra progride e, ao final, exibe tela de assinatura
  useEffect(() => {
    if (!showFillingScreen) {
      setFillingProgress(0);
      return;
    }

    let current = 0;
    setFillingProgress(0);

    const interval = window.setInterval(() => {
      current += 20;
      if (current >= 100) {
        window.clearInterval(interval);
        setFillingProgress(100);
        setShowFillingScreen(false);
        setSignatureDialogOpen(true);
      } else {
        setFillingProgress(current);
      }
    }, 400);

    return () => {
      window.clearInterval(interval);
    };
  }, [showFillingScreen]);

  // Após clicar em Assinar, mostra tela de "Assinando..." e depois transita para "Documento Assinado"
  useEffect(() => {
    if (!showSigningScreen) return;

    const timeout = window.setTimeout(() => {
      setShowSigningScreen(false);
      setShowSignedScreen(true);
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [showSigningScreen]);

  const saudacao = medicoNome ? `Olá, Dr. ${medicoNome}.` : "Olá, médico.";
  const totalSteps = 6;
  const currentStep =
    view === "start"
      ? 1
      : view === "hospital"
        ? 1
        : view === "upload"
          ? 2
          : 6;

  const handleNovaDescricao = () => {
    setFiles([]);
    setStep(1);
    setView("start");
    setSelectedHospitalId(undefined);
    setSelectedHospitalName("");
    setHospitalStepView("selector");
    setSelectedClinicaId(undefined);
    setSelectedClinicaName("");
    setClinicaStepView("selector");
    setUseSameAsHospital(false);
  };

  const totalArquivos = files.length;
  const arquivosLabel =
    totalArquivos === 0
      ? "Nenhum arquivo"
      : totalArquivos === 1
        ? "1 arquivo"
        : `${totalArquivos} arquivos`;

  const isSameBillingLocation = Boolean(
    selectedHospitalId &&
      selectedClinicaId &&
      selectedHospitalId === selectedClinicaId,
  );

  useEffect(() => {
    if (!showSendingScreen || isSameBillingLocation) {
      setSendingStep(1);
      return;
    }

    setSendingStep(1);

    const timeout = window.setTimeout(() => {
      setSendingStep(2);
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [showSendingScreen, isSameBillingLocation]);

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
    setClinicaStepView("selector");
    if (!hospitaisMedico.length) {
      void carregarHospitaisDoMedico();
    }
    if (!clinicasMedico.length) {
      void carregarClinicasDoMedico();
    }
  };

  // Handler para o checkbox "Mesmo hospital"
  const handleUseSameAsHospitalChange = (checked: boolean) => {
    setUseSameAsHospital(checked);
    if (checked && selectedHospitalId) {
      setSelectedClinicaId(selectedHospitalId);
      setSelectedClinicaName(selectedHospitalName);
    } else if (!checked) {
      setSelectedClinicaId(undefined);
      setSelectedClinicaName("");
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

  const handleContinuarAposHospitalClinica = () => {
    if (!selectedHospitalId) {
      showError("Selecione o hospital onde a cirurgia foi realizada.");
      return;
    }
    if (!selectedClinicaId) {
      showError("Selecione a clínica/hospital onde o serviço será faturado.");
      return;
    }
    setView("upload");
  };

  const handleAbrirListaClinicas = () => {
    if (!loadingClinicas && clinicasMedico.length > 0) {
      setClinicaStepView("list");
    }
  };

  const handleSelecionarClinica = (clinica: {
    id: string;
    nome_fantasia: string;
  }) => {
    setSelectedClinicaId(clinica.id);
    setSelectedClinicaName(clinica.nome_fantasia);
    setClinicaStepView("selector");
  };

  const handleVoltarListaClinicasParaSelector = () => {
    setClinicaStepView("selector");
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#F5F5F5] relative overflow-hidden">
      {/* Fundo premium */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.10)_0,#0b0b0b_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-[#121212]/80" />

      <div className="relative z-10 flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {(view === "upload" || view === "success") && (
          <>
            <p className="mb-3 text-sm font-semibold text-[#D4A017] sm:text-base">
              {saudacao}
            </p>

            <header className="mb-5 flex items-center justify-between gap-3">
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-xs text-[#F5F5F5] shadow-sm border border-[#D4A017]/20 hover:border-[#D4A017]/40 transition-colors"
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

              <div className="flex items-center gap-2 rounded-full bg-[#D4A017]/10 px-3 py-1.5 text-[11px] text-[#D4A017] border border-[#D4A017]/25">
                <span className="h-2 w-2 rounded-full bg-[#D4A017] shadow-[0_0_8px_rgba(212,160,23,0.8)]" />
                <span>
                  {view === "upload" ? "Passo 2/6" : "Envio de Desc. Cirúrgica"}
                </span>
              </div>
            </header>
          </>
        )}

        {/* Barra de progresso do fluxo sempre no topo */}
        <div className="mb-5 w-full max-w-md self-center">
          <div className="h-1 w-full rounded-full bg-black/40 border border-[#D4A017]/10">
            <div
              className="h-1 rounded-full bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Conteúdo principal */}
        <main className="flex flex-1 flex-col items-center justify-start">
          {/* TELA 1 - START */}
          {view === "start" && (
            <div className="flex w-full flex-1 items-center justify-center">
              <div className="flex w-full max-w-sm flex-col items-center text-center">
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

                <p className="mb-2 text-sm font-semibold text-[#D4A017]">
                  {saudacao}
                </p>
                <h1 className="text-xl font-semibold text-[#F5F5F5] sm:text-2xl">
                  Novo Faturamento
                </h1>
                <p className="mt-3 max-w-xs text-sm text-[#9CA3AF]">
                  Vamos iniciar o processo de Acompanhamento de Faturamento
                </p>

                <button
                  type="button"
                  onClick={handleIniciarFluxo}
                  className="mt-10 flex h-52 w-52 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] via-[#D4A017] to-[#B8860B] text-center text-black shadow-[0_0_60px_rgba(212,160,23,0.35)] ring-8 ring-[#D4A017]/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_90px_rgba(212,160,23,0.45)] sm:h-56 sm:w-56"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-black shadow-inner">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="text-[15px] font-semibold">
                      Iniciar Agora
                    </span>
                  </div>
                </button>

                <p className="mt-8 text-[11px] text-[#6B7280]">
                  Seus dados são criptografados ponta a ponta.
                </p>
              </div>
            </div>
          )}

          {/* TELA 2 - HOSPITAL + CLÍNICA (Nova tela unificada) */}
          {view === "hospital" && (
            <div className="flex w-full flex-1 items-start justify-center pt-4">
              {hospitalStepView === "selector" && clinicaStepView === "selector" ? (
                <div className="w-full max-w-sm rounded-2xl bg-black/70 backdrop-blur-xl px-6 py-6 shadow-[0_0_40px_rgba(212,160,23,0.12)] border border-[#D4A017]/20">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#F5F5F5]">
                        {medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleFecharSelecaoHospital}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-[#9CA3AF] border border-[#D4A017]/15 hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* 1. Seleção de Hospital */}
                  <div className="mb-5">
                    <p className="mb-3 text-xs text-[#9CA3AF]">
                      <span className="font-semibold text-[#F5F5F5]">1.</span>{" "}
                      Informe o Hospital que a{" "}
                      <span className="text-[#D4A017] font-semibold">cirurgia</span>{" "}
                      foi realizada
                    </p>
                    <button
                      type="button"
                      onClick={handleAbrirListaHospitais}
                      disabled={
                        loadingHospitais ||
                        (!hospitaisMedico.length && !selectedHospitalId)
                      }
                      className="flex w-full items-center justify-between rounded-2xl border border-[#D4A017]/30 bg-[#121212] px-4 py-3 text-left text-[#F5F5F5] hover:border-[#D4A017]/50 transition-colors disabled:opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_18px_rgba(212,160,23,0.25)]">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D4A017]/80">
                            Hospital selecionado
                          </span>
                          <span className="text-sm font-semibold">
                            {selectedHospitalName ||
                              (loadingHospitais
                                ? "Carregando hospitais..."
                                : hospitaisMedico.length
                                  ? "Selecionar Hospital"
                                  : "Nenhum hospital disponível")}
                          </span>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
                    </button>
                  </div>

                  {/* 2. Seleção de Clínica/Hospital para Faturamento */}
                  <div className="mb-4">
                    <p className="mb-3 text-xs text-[#9CA3AF]">
                      <span className="font-semibold text-[#F5F5F5]">2.</span>{" "}
                      Informe o Hospital/Clínica que a cirurgia será{" "}
                      <span className="text-[#D4A017] font-semibold">faturada</span>
                    </p>

                    {/* Checkbox "Mesmo hospital que foi realizada a cirurgia" */}
                    <label className="mb-3 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSameAsHospital}
                        onChange={(e) => handleUseSameAsHospitalChange(e.target.checked)}
                        disabled={!selectedHospitalId}
                        className="h-4 w-4 rounded border-[#D4A017]/30 bg-[#121212] text-[#D4A017] focus:ring-[#D4A017]/50 focus:ring-offset-0 disabled:opacity-50"
                      />
                      <span className="text-[11px] text-[#9CA3AF]">
                        Mesmo hospital que foi realizada a cirurgia
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAbrirListaClinicas}
                      disabled={
                        useSameAsHospital ||
                        loadingClinicas ||
                        (!clinicasMedico.length && !selectedClinicaId && !useSameAsHospital)
                      }
                      className={`flex w-full items-center justify-between rounded-2xl border border-[#D4A017]/30 bg-[#121212] px-4 py-3 text-left text-[#F5F5F5] transition-colors ${
                        useSameAsHospital
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:border-[#D4A017]/50"
                      } disabled:opacity-60`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
                          <CircleDollarSign className="h-4 w-4" />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D4A017]/80">
                            Faturamento por
                          </span>
                          <span className="text-sm font-semibold">
                            {selectedClinicaName ||
                              (loadingClinicas
                                ? "Carregando clínicas..."
                                : clinicasMedico.length
                                  ? "Selecionar Clínica"
                                  : "Nenhuma clínica vinculada")}
                          </span>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleContinuarAposHospitalClinica}
                    disabled={!selectedHospitalId || !selectedClinicaId}
                    className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                      selectedHospitalId && selectedClinicaId
                        ? "bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black shadow-[0_0_20px_rgba(212,160,23,0.35)] hover:shadow-[0_0_30px_rgba(212,160,23,0.55)] hover:scale-[1.01]"
                        : "cursor-not-allowed bg-black/50 text-[#6B7280] border border-[#D4A017]/10"
                    }`}
                  >
                    Continuar
                  </button>
                </div>
              ) : hospitalStepView === "list" ? (
                <div className="w-full max-w-sm rounded-2xl bg-black/70 backdrop-blur-xl px-5 py-5 shadow-[0_0_40px_rgba(212,160,23,0.12)] border border-[#D4A017]/20">
                  <div className="mb-5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleVoltarListaParaSelector}
                      className="flex items-center gap-2 text-xs text-[#9CA3AF] hover:text-[#D4A017]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Voltar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFecharSelecaoHospital}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-[#9CA3AF] border border-[#D4A017]/15 hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="mb-4 text-xs text-[#9CA3AF]">
                    Selecione o hospital onde a cirurgia foi realizada:
                  </p>

                  <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {loadingHospitais && (
                      <p className="text-xs text-[#9CA3AF]">
                        Carregando hospitais...
                      </p>
                    )}

                    {!loadingHospitais &&
                      hospitaisMedico.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            handleSelecionarHospital(h);
                            // Se o checkbox estiver marcado, atualiza a clínica também
                            if (useSameAsHospital) {
                              setSelectedClinicaId(h.id);
                              setSelectedClinicaName(h.nome_fantasia);
                            }
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl bg-[#121212] px-4 py-3 text-left text-[#F5F5F5] border border-[#D4A017]/15 hover:border-[#D4A017]/35 hover:bg-black/40 transition-colors"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
                            <Building2 className="h-4 w-4" />
                          </span>
                          <span className="text-sm font-medium">
                            {h.nome_fantasia}
                          </span>
                        </button>
                      ))}

                    {!loadingHospitais && !hospitaisMedico.length && (
                      <p className="text-xs text-[#6B7280]">
                        Não encontramos hospitais disponíveis.
                        Entre em contato com o administrador.
                      </p>
                    )}
                  </div>
                </div>
              ) : clinicaStepView === "list" ? (
                <div className="w-full max-w-sm rounded-2xl bg-black/70 backdrop-blur-xl px-5 py-5 shadow-[0_0_40px_rgba(212,160,23,0.12)] border border-[#D4A017]/20">
                  <div className="mb-5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleVoltarListaClinicasParaSelector}
                      className="flex items-center gap-2 text-xs text-[#9CA3AF] hover:text-[#D4A017]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Voltar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setClinicaStepView("selector")}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-[#9CA3AF] border border-[#D4A017]/15 hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="mb-4 text-xs text-[#9CA3AF]">
                    Selecione a clínica para faturamento:
                  </p>

                  <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {loadingClinicas && (
                      <p className="text-xs text-[#9CA3AF]">
                        Carregando clínicas vinculadas...
                      </p>
                    )}

                    {!loadingClinicas &&
                      clinicasMedico.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelecionarClinica(c)}
                          className="flex w-full items-center gap-3 rounded-2xl bg-[#121212] px-4 py-3 text-left text-[#F5F5F5] border border-[#D4A017]/15 hover:border-[#D4A017]/35 hover:bg-black/40 transition-colors"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
                            <Building2 className="h-4 w-4" />
                          </span>
                          <span className="text-sm font-medium">
                            {c.nome_fantasia}
                          </span>
                        </button>
                      ))}

                    {!loadingClinicas && !clinicasMedico.length && (
                      <p className="text-xs text-[#6B7280]">
                        Não encontramos clínicas vinculadas ao seu cadastro.
                        Entre em contato com o administrador.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TELA 3 - UPLOAD */}
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
                <h1 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl">
                  {medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}
                </h1>
                <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
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

                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={file.name + file.lastModified + index}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-black/60 px-4 py-3 text-xs text-[#F5F5F5] border border-[#D4A017]/15 hover:border-[#D4A017]/30 transition-colors"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
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
                    onClick={() => setAutoFillDialogOpen(true)}
                  >
                    {isUploading ? "Enviando..." : "Continuar Envio"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
                    onClick={handleNovaDescricao}
                    disabled={isUploading}
                  >
                    Voltar para Nova Descrição
                  </Button>
                </>
              )}
            </div>
          )}

          {/* TELA 5 - SUCESSO GERAL (final do processo) */}
          {view === "success" && (
            <div className="mt-6 flex w-full max-w-md flex-col items-stretch">
              <Card className="rounded-2xl border border-[#D4A017]/20 bg-black/70 backdrop-blur-xl text-center shadow-[0_0_40px_rgba(212,160,23,0.12)]">
                <CardContent className="space-y-6 px-6 py-8">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_30px_rgba(212,160,23,0.35)]">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl">
                      {medicoNome
                        ? `Tudo certo, Dr. ${medicoNome}!`
                        : "Tudo certo!"}
                    </h2>
                    <p className="text-xs text-[#9CA3AF] sm:text-sm">
                      A descrição cirúrgica e os documentos foram enviados com
                      sucesso.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      type="button"
                      className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
                      onClick={handleNovaDescricao}
                    >
                      Enviar Nova Descrição Cirúrgica
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                      onClick={() => navigate("/medico/dashboard")}
                    >
                      Início
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Modal de Preenchimento Automático de Honorários */}
      <Dialog open={autoFillDialogOpen} onOpenChange={setAutoFillDialogOpen}>
        <DialogContent className="w-[88%] max-w-sm rounded-2xl border border-[#D4A017]/20 bg-black/80 backdrop-blur-xl px-6 py-7 text-center shadow-[0_0_40px_rgba(212,160,23,0.12)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold text-[#F5F5F5] sm:text-lg">
            Preenchimento Automático
          </h2>
          <p className="mt-2 text-xs text-[#9CA3AF] sm:text-sm">
            Você quer que o sistema preencha o formulário de honorários para
            você?
          </p>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)]"
              disabled={isUploading}
              onClick={() => {
                setAutoFillDialogOpen(false);
                setShowFillingScreen(true);
              }}
            >
              {isUploading ? "Enviando..." : "Sim, preencher agora"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
              disabled={isUploading}
              onClick={() => {
                setAutoFillDialogOpen(false);
                setShowSendingScreen(true);
                void handleUpload();
              }}
            >
              Não, obrigado
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tela de Assinatura Digital do formulário de honorários */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="w-[88%] max-w-sm rounded-2xl border border-[#D4A017]/20 bg-black/80 backdrop-blur-xl px-6 py-7 text-center shadow-[0_0_40px_rgba(212,160,23,0.12)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
            <Signature className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold text-[#F5F5F5] sm:text-lg">
            Assinatura Digital
          </h2>
          <p className="mt-2 text-xs text-[#9CA3AF] sm:text-sm">
            Vamos realizar a assinatura digital do formulário de honorários.
            Toque em &quot;Assinar&quot; para confirmar.
          </p>
          <div className="mt-6">
            <Button
              type="button"
              className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)]"
              disabled={isUploading}
              onClick={() => {
                setSignatureDialogOpen(false);
                setShowSigningScreen(true);
              }}
            >
              Assinar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tela de progresso de preenchimento do formulário de honorários */}
      {showFillingScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="w-[88%] max-w-sm rounded-2xl border border-[#D4A017]/20 bg-black/80 px-6 py-7 text-center shadow-[0_0_40px_rgba(212,160,23,0.12)]">
            <h2 className="text-base font-semibold text-[#F5F5F5] sm:text-lg">
              Preenchendo Formulário...
            </h2>
            <div className="mt-5">
              <Progress value={fillingProgress} className="h-2.5 rounded-full" />
            </div>
            <p className="mt-3 text-xs text-[#9CA3AF] sm:text-sm">
              Aguarde um momento.
            </p>
          </div>
        </div>
      )}

      {/* Tela "Assinando..." */}
      {showSigningScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="w-[88%] max-w-sm rounded-2xl border border-[#D4A017]/20 bg-black/80 px-6 py-7 text-center shadow-[0_0_40px_rgba(212,160,23,0.12)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
              <Signature className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-[#F5F5F5] sm:text-lg">
              Assinando...
            </h2>
            <p className="mt-2 text-xs text-[#9CA3AF] sm:text-sm">
              Aplicando sua assinatura digital segura nos documentos.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D4A017] animate-pulse" />
              <span className="h-2 w-2 rounded-full bg-[#D4A017]/70 animate-pulse [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-[#D4A017]/40 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      {/* Tela "Documento Assinado" (pergunta se deseja enviar para faturamento) */}
      {showSignedScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="w-[88%] max-w-sm rounded-2xl bg-black/80 px-6 py-7 text-center shadow-[0_0_40px_rgba(212,160,23,0.12)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_20px_rgba(212,160,23,0.35)]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-[#F5F5F5] sm:text-lg">
              Documento Assinado
            </h2>
            <p className="mt-2 text-xs text-[#9CA3AF] sm:text-sm">
              A assinatura foi aplicada. Deseja enviar os documentos para
              faturamento agora?
            </p>
            <div className="mt-6">
              <Button
                type="button"
                className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)]"
                disabled={isUploading}
                onClick={() => {
                  setShowSignedScreen(false);
                  setShowSendingScreen(true);
                  void handleUpload();
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <span>Enviar para Faturamento</span>
                  <Send className="h-4 w-4" />
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tela "Enviando" com ícones de envelope */}
      {showSendingScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="flex w-full max-w-sm flex-col items-center px-6 py-10 text-center">
            {/* Orb animado ao estilo macOS */}
            <div className="relative mb-7 flex h-24 w-24 items-center justify-center rounded-[32px] bg-gradient-to-br from-[#FFD700] via-[#D4A017] to-[#B8860B] shadow-[0_0_60px_rgba(212,160,23,0.35)]">
              <div className="absolute inset-1 rounded-[26px] bg-black/60 backdrop-blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#121212] border border-[#D4A017]/20 shadow-[0_10px_40px_rgba(0,0,0,0.65)]">
                <Mail className="h-8 w-8 text-[#D4A017]" />
                {/* "Pacotes" de e-mail orbitando */}
                <span className="pointer-events-none absolute -left-6 top-1/2 h-8 w-8 -translate-y-1/2 rounded-2xl bg-[#121212] text-[#F5F5F5] border border-[#D4A017]/15 shadow-[0_10px_25px_rgba(0,0,0,0.6)] animate-bounce">
                  <Mail className="mx-auto mt-[7px] h-4 w-4" />
                </span>
                <span className="pointer-events-none absolute -right-6 top-1/2 h-8 w-8 -translate-y-1/2 rounded-2xl bg-[#121212] text-[#F5F5F5] border border-[#D4A017]/15 shadow-[0_10px_25px_rgba(0,0,0,0.6)] animate-bounce [animation-delay:220ms]">
                  <Mail className="mx-auto mt-[7px] h-4 w-4" />
                </span>
              </div>
            </div>

            <h2 className="text-base font-semibold text-[#F5F5F5] sm:text-lg">
              Sincronizando com o faturamento
            </h2>
            <p className="mt-2 text-[11px] text-[#9CA3AF] sm:text-xs">
              Estamos transmitindo seus documentos de forma segura para os
              e-mails de faturamento.
            </p>

            {/* Barra de "progresso" com brilho suave */}
            <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-black/50 border border-[#D4A017]/10">
              <div className="h-1.5 w-1/2 rounded-full bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] animate-[pulse_1.8s_ease-in-out_infinite]" />
            </div>

            <div className="mt-5 w-full max-w-xs rounded-2xl border border-[#D4A017]/15 bg-black/70 p-4 text-left text-[11px] text-[#9CA3AF] shadow-[0_18px_50px_rgba(0,0,0,0.75)] sm:text-xs">
              {isSameBillingLocation ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A017]/10 px-3 py-1 text-[10px] text-[#D4A017] border border-[#D4A017]/25">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4A017] animate-pulse" />
                    <span>1 e-mail de faturamento em envio</span>
                  </div>
                  <p className="mt-1 font-medium text-[#F5F5F5]">
                    Avisando a clinica{" "}
                    <span className="font-semibold text-[#D4A017]">
                      {selectedClinicaName || "selecionada"}
                    </span>{" "}
                    que esse serviço será faturado.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#D4A017]/10 px-3 py-1 text-[10px] text-[#D4A017] border border-[#D4A017]/25">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4A017] animate-pulse" />
                    <span>2 e-mails sendo enviados em sequência</span>
                  </div>

                  <div className="relative space-y-2 pl-4">
                    {/* Linha vertical estilo timeline */}
                    <span className="pointer-events-none absolute left-1 top-1 h-full w-px bg-gradient-to-b from-[#D4A017]/60 via-[#D4A017]/10 to-transparent" />

                    <p
                      className={
                        sendingStep === 1
                          ? "font-medium text-[#F5F5F5] animate-pulse"
                          : "font-medium text-[#9CA3AF]"
                      }
                    >
                      <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#D4A017]/10 text-[10px] text-[#D4A017] border border-[#D4A017]/25">
                        1
                      </span>
                      Avisando o hospital{" "}
                      <span className="font-semibold">
                        {selectedHospitalName || "selecionado"}
                      </span>{" "}
                      que esse serviço não será faturado.
                    </p>

                    <p
                      className={
                        sendingStep === 2
                          ? "font-medium text-[#F5F5F5] animate-pulse"
                          : "font-medium text-[#6B7280]"
                      }
                    >
                      <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#D4A017]/5 text-[10px] text-[#D4A017]/90 border border-[#D4A017]/15">
                        2
                      </span>
                      Avisando a clinica{" "}
                      <span className="font-semibold">
                        {selectedClinicaName || "selecionada"}
                      </span>{" "}
                      que esse serviço será faturado.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicoUploadDescricaoCirurgica;