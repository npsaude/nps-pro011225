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
  Loader2,
  Brain,
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

type ViewState = "start" | "hospital" | "upload_guia" | "upload_descricao" | "upload_honorarios" | "success";

const MedicoUploadDescricaoCirurgica: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hospitalId } = (location.state ?? {}) as { hospitalId?: string };

  // Arquivos da Guia de Autorização
  const [filesGuia, setFilesGuia] = useState<File[]>([]);
  // Arquivos da Descrição Cirúrgica
  const [filesDescricao, setFilesDescricao] = useState<File[]>([]);
  // Arquivos da Guia de Honorários
  const [filesHonorarios, setFilesHonorarios] = useState<File[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [medicoNome, setMedicoNome] = useState<string>("");
  const [view, setView] = useState<ViewState>("start");
  const fileInputRefGuia = useRef<HTMLInputElement | null>(null);
  const fileInputRefDescricao = useRef<HTMLInputElement | null>(null);
  const fileInputRefHonorarios = useRef<HTMLInputElement | null>(null);
  const [autoFillDialogOpen, setAutoFillDialogOpen] = useState(false);
  const [showFillingScreen, setShowFillingScreen] = useState(false);
  const [fillingProgress, setFillingProgress] = useState(0);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [showSigningScreen, setShowSigningScreen] = useState(false);
  const [showSignedScreen, setShowSignedScreen] = useState(false);
  const [showSendingScreen, setShowSendingScreen] = useState(false);
  const [sendingStep, setSendingStep] = useState<1 | 2>(1);

  // Tela de análise da IA
  const [showAnalyzingScreen, setShowAnalyzingScreen] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [analyzingStep, setAnalyzingStep] = useState<"uploading" | "analyzing" | "saving">("uploading");
  const [analyzingDocType, setAnalyzingDocType] = useState<"guia" | "descricao" | "honorarios">("guia");

  // ID do faturamento criado no início do fluxo (fica INATIVO até registrar guia de autorização)
  const [faturamentoId, setFaturamentoId] = useState<string | null>(null);

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
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        showError("Faça login para selecionar a instituição de faturamento.");
        navigate("/login-medico");
        return;
      }

      // Lista de instituições para faturamento vem de public.clinicas (somente ATIVAS)
      // Observação: não filtramos por tipo_unidade aqui; a tela permite Clínica ou Hospital.
      const { data: clinicasData, error: clinicasError } = await supabase
        .from("clinicas")
        .select("id, nome_fantasia")
        .eq("status", "ATIVA")
        .order("nome_fantasia", { ascending: true });

      if (clinicasError) {
        throw new Error(
          clinicasError.message ||
            "Não foi possível carregar a lista de instituições para faturamento.",
        );
      }

      const lista = (clinicasData ?? []) as { id: string; nome_fantasia: string }[];
      setClinicasMedico(lista);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível carregar a lista de instituições para faturamento.";
      showError(message);
    } finally {
      setLoadingClinicas(false);
    }
  };

  // Handler para arquivos da Guia de Autorização
  const handleFileChangeGuia = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setFilesGuia([]);
      showError(
        "Nenhum arquivo válido foi selecionado. Envie imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
      );
      return;
    }

    setFilesGuia((prev) => [...prev, ...allowedFiles]);
    event.target.value = "";
  };

  // Handler para arquivos da Descrição Cirúrgica
  const handleFileChangeDescricao = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setFilesDescricao([]);
      showError(
        "Nenhum arquivo válido foi selecionado. Envie imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
      );
      return;
    }

    setFilesDescricao((prev) => [...prev, ...allowedFiles]);
    event.target.value = "";
  };

  // Handler para arquivos da Guia de Honorários
  const handleFileChangeHonorarios = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      setFilesHonorarios([]);
      showError(
        "Nenhum arquivo válido foi selecionado. Envie imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
      );
      return;
    }

    setFilesHonorarios((prev) => [...prev, ...allowedFiles]);
    event.target.value = "";
  };

  const upsertFaturamentoParcial = async (params: {
    instituicaoCirurgiaId: string;
    instituicaoFaturamentoId: string;
    hospitalNome?: string;
    instituicaoFaturamentoNome?: string;
  }) => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      showError("Faça login novamente para continuar.");
      navigate("/login-medico");
      return null;
    }

    const medicoId = authData.user.id;

    if (!faturamentoId) {
      const { data, error } = await supabase
        .from("faturamentos")
        .insert({
          medico_id: medicoId,
          instituicao_cirurgia_id: params.instituicaoCirurgiaId,
          instituicao_faturamento_id: params.instituicaoFaturamentoId,
          hospital_nome: params.hospitalNome ?? null,
          status: "INATIVO",
          // manter arrays como default no banco
        })
        .select("id")
        .single();

      if (error || !data?.id) {
        showError("Não foi possível criar o faturamento. Tente novamente.");
        return null;
      }

      setFaturamentoId(data.id as string);
      return data.id as string;
    }

    const { error } = await supabase
      .from("faturamentos")
      .update({
        instituicao_cirurgia_id: params.instituicaoCirurgiaId,
        instituicao_faturamento_id: params.instituicaoFaturamentoId,
        hospital_nome: params.hospitalNome ?? null,
      })
      .eq("id", faturamentoId);

    if (error) {
      showError("Não foi possível atualizar o faturamento. Tente novamente.");
      return null;
    }

    return faturamentoId;
  };

  // Função para upload e análise da Guia de Autorização com tela de progresso
  const handleUploadGuiaAutorizacao = async () => {
    if (filesGuia.length === 0) {
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
    setShowAnalyzingScreen(true);
    setAnalyzingProgress(0);
    setAnalyzingStep("uploading");
    setAnalyzingDocType("guia");

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

      // Garante que existe um faturamento parcial
      const ensuredFaturamentoId = await upsertFaturamentoParcial({
        instituicaoCirurgiaId: selectedHospitalId,
        instituicaoFaturamentoId: selectedClinicaId,
        hospitalNome: selectedHospitalName,
        instituicaoFaturamentoNome: selectedClinicaName,
      });

      if (!ensuredFaturamentoId) {
        throw new Error("Não foi possível criar o faturamento.");
      }

      // Etapa 1: Upload dos arquivos (0-30%)
      setAnalyzingProgress(10);
      
      for (let i = 0; i < filesGuia.length; i++) {
        const file = filesGuia[i];
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
        // Progresso proporcional ao número de arquivos (10-30%)
        setAnalyzingProgress(10 + Math.round((i + 1) / filesGuia.length * 20));
      }

      // Etapa 2: Análise da IA (30-80%)
      setAnalyzingStep("analyzing");
      setAnalyzingProgress(35);

      const functionUrl =
        "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-guia-autorizacao";

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          faturamentoId: ensuredFaturamentoId,
          files: uploadedFilePaths.map((path) => ({ path })),
        }),
      });

      setAnalyzingProgress(70);

      let responseJson: any = null;
      try {
        responseJson = await response.json();
      } catch {
        // se não veio JSON, seguimos só com o status HTTP
      }

      if (!response.ok || responseJson?.error) {
        const errorMessage =
          responseJson?.error ??
          "Houve erro ao processar a guia de autorização.";
        throw new Error(errorMessage);
      }

      // Etapa 3: Salvando dados (80-100%)
      setAnalyzingStep("saving");
      setAnalyzingProgress(85);

      // Atualiza o faturamento com os arquivos da guia de autorização
      const { error: updateError } = await supabase
        .from("faturamentos")
        .update({
          url_guia_autorizacao: uploadedFilePaths,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ensuredFaturamentoId);

      if (updateError) {
        console.error("Erro ao atualizar faturamento:", updateError);
      }

      setAnalyzingProgress(100);

      // Aguarda um momento para mostrar 100%
      await new Promise((resolve) => setTimeout(resolve, 500));

      showSuccess("Guia de autorização processada com sucesso!");
      setFilesGuia([]);
      setShowAnalyzingScreen(false);
      setView("upload_descricao");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível processar a guia de autorização.";
      showError(message);
      setShowAnalyzingScreen(false);
    } finally {
      setIsUploading(false);
    }
  };

  // Função para upload e análise da Descrição Cirúrgica com tela de progresso
  const handleUploadDescricaoCirurgica = async () => {
    if (filesDescricao.length === 0) {
      showError("Selecione pelo menos um arquivo para enviar.");
      return;
    }

    if (!faturamentoId) {
      showError("Faturamento não encontrado. Inicie o fluxo novamente.");
      return;
    }

    setIsUploading(true);
    setShowAnalyzingScreen(true);
    setAnalyzingProgress(0);
    setAnalyzingStep("uploading");
    setAnalyzingDocType("descricao");

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

      // Etapa 1: Upload dos arquivos (0-30%)
      setAnalyzingProgress(10);
      
      for (let i = 0; i < filesDescricao.length; i++) {
        const file = filesDescricao[i];
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
            `Falha ao enviar "${file.name}": ${uploadError.message}`
          );
        }

        uploadedFilePaths.push(filePath);
        // Progresso proporcional ao número de arquivos (10-30%)
        setAnalyzingProgress(10 + Math.round((i + 1) / filesDescricao.length * 20));
      }

      // Etapa 2: Análise da IA (30-80%)
      setAnalyzingStep("analyzing");
      setAnalyzingProgress(35);

      const functionUrl =
        "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-descricao-cirurgica";

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

      setAnalyzingProgress(70);

      let responseJson: any = null;
      try {
        responseJson = await response.json();
      } catch {
        // se não veio JSON, seguimos só com o status HTTP
      }

      if (!response.ok || responseJson?.error) {
        const errorMessage =
          responseJson?.error ??
          "Houve erro ao processar a descrição cirúrgica.";
        throw new Error(errorMessage);
      }

      // Etapa 3: Salvando dados (80-100%)
      setAnalyzingStep("saving");
      setAnalyzingProgress(85);

      // Atualiza o faturamento com os arquivos da descrição cirúrgica
      const { error: updateError } = await supabase
        .from("faturamentos")
        .update({
          url_descricao_cirurgica: uploadedFilePaths,
          updated_at: new Date().toISOString(),
        })
        .eq("id", faturamentoId);

      if (updateError) {
        console.error("Erro ao atualizar faturamento:", updateError);
      }

      setAnalyzingProgress(100);

      // Aguarda um momento para mostrar 100%
      await new Promise((resolve) => setTimeout(resolve, 500));

      showSuccess("Descrição cirúrgica processada com sucesso!");
      setFilesDescricao([]);
      setShowAnalyzingScreen(false);
      setView("upload_honorarios");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível processar a descrição cirúrgica.";
      showError(message);
      setShowAnalyzingScreen(false);
    } finally {
      setIsUploading(false);
    }
  };

  // Função para upload e análise da Guia de Faturamento de Honorários com tela de progresso
  const handleUploadGuiaHonorarios = async () => {
    if (filesHonorarios.length === 0) {
      showError("Selecione pelo menos um arquivo para enviar.");
      return;
    }

    if (!faturamentoId) {
      showError("Faturamento não encontrado. Inicie o fluxo novamente.");
      return;
    }

    setIsUploading(true);
    setShowAnalyzingScreen(true);
    setAnalyzingProgress(0);
    setAnalyzingStep("uploading");
    setAnalyzingDocType("honorarios");

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

      // Etapa 1: Upload dos arquivos (0-30%)
      setAnalyzingProgress(10);
      
      for (let i = 0; i < filesHonorarios.length; i++) {
        const file = filesHonorarios[i];
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const timestamp = Date.now();
        const filePath = `guia_honorarios/${userId}/${timestamp}-${safeName}`;

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
        // Progresso proporcional ao número de arquivos (10-30%)
        setAnalyzingProgress(10 + Math.round((i + 1) / filesHonorarios.length * 20));
      }

      // Etapa 2: Análise da IA (30-80%)
      setAnalyzingStep("analyzing");
      setAnalyzingProgress(35);

      const functionUrl =
        "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-guia-honorarios";

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

      setAnalyzingProgress(70);

      let responseJson: any = null;
      try {
        responseJson = await response.json();
      } catch {
        // se não veio JSON, seguimos só com o status HTTP
      }

      if (!response.ok || responseJson?.error) {
        const errorMessage =
          responseJson?.error ??
          "Houve erro ao processar a guia de faturamento de honorários.";
        throw new Error(errorMessage);
      }

      // Etapa 3: Salvando dados (80-100%)
      setAnalyzingStep("saving");
      setAnalyzingProgress(85);

      // Atualiza o faturamento com os arquivos da guia de honorários
      const { error: updateError } = await supabase
        .from("faturamentos")
        .update({
          url_guia_honorarios: uploadedFilePaths,
          status: "ATIVO", // Ativa o faturamento após completar todos os uploads
          updated_at: new Date().toISOString(),
        })
        .eq("id", faturamentoId);

      if (updateError) {
        console.error("Erro ao atualizar faturamento:", updateError);
      }

      setAnalyzingProgress(100);

      // Aguarda um momento para mostrar 100%
      await new Promise((resolve) => setTimeout(resolve, 500));

      showSuccess("Guia de faturamento de honorários processada com sucesso!");
      setFilesHonorarios([]);
      setShowAnalyzingScreen(false);
      setView("success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível processar a guia de faturamento de honorários.";
      showError(message);
      setShowAnalyzingScreen(false);
    } finally {
      setIsUploading(false);
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
        : view === "upload_guia"
         ? 2
         : view === "upload_descricao"
          ? 3
          : view === "upload_honorarios"
            ? 4
            : 6;

  const handleNovaDescricao = () => {
    setFilesGuia([]);
    setFilesDescricao([]);
    setFilesHonorarios([]);
    setStep(1);
    setView("start");
    setSelectedHospitalId(undefined);
    setSelectedHospitalName("");
    setHospitalStepView("selector");
    setSelectedClinicaId(undefined);
    setSelectedClinicaName("");
    setClinicaStepView("selector");
    setUseSameAsHospital(false);
    setFaturamentoId(null);
  };

  // Arquivos atuais baseado na view
  const currentFiles = view === "upload_guia" ? filesGuia : view === "upload_descricao" ? filesDescricao : filesHonorarios;
  const totalArquivos = currentFiles.length;
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

  const handleAdicionarMaisGuia = () => {
    fileInputRefGuia.current?.click();
  };

  const handleAdicionarMaisDescricao = () => {
    fileInputRefDescricao.current?.click();
  };

  const handleAdicionarMaisHonorarios = () => {
    fileInputRefHonorarios.current?.click();
  };

  const handleRemoverArquivoGuia = (index: number) => {
    setFilesGuia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoverArquivoDescricao = (index: number) => {
    setFilesDescricao((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoverArquivoHonorarios = (index: number) => {
    setFilesHonorarios((prev) => prev.filter((_, i) => i !== index));
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

  const handleAbrirListaClinicas = () => {
    if (useSameAsHospital) return;

    // Mesmo comportamento de "CIRURGIA REALIZADA EM": se já carregou, abre; se não, carrega.
    if (!loadingClinicas && clinicasMedico.length > 0) {
      setClinicaStepView("list");
      return;
    }

    if (!loadingClinicas && clinicasMedico.length === 0) {
      void carregarClinicasDoMedico();
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

    void (async () => {
      const ensuredId = await upsertFaturamentoParcial({
        instituicaoCirurgiaId: selectedHospitalId,
        instituicaoFaturamentoId: selectedClinicaId,
        hospitalNome: selectedHospitalName,
        instituicaoFaturamentoNome: selectedClinicaName,
      });

      if (!ensuredId) return;
      setView("upload_guia");
    })();
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

  // Função para obter o título do documento sendo analisado
  const getAnalyzingDocTitle = () => {
    switch (analyzingDocType) {
      case "guia":
        return "Guia de Autorização de Cirurgia";
      case "descricao":
        return "Descrição Cirúrgica";
      case "honorarios":
        return "Guia de Faturamento de Honorários";
      default:
        return "";
    }
  };

  // Função para obter a descrição do passo de análise
  const getAnalyzingStepDescription = () => {
    if (analyzingStep === "uploading") {
      switch (analyzingDocType) {
        case "guia":
          return "Fazendo upload das imagens da guia de autorização.";
        case "descricao":
          return "Fazendo upload das imagens da descrição cirúrgica.";
        case "honorarios":
          return "Fazendo upload das imagens da guia de faturamento de honorários.";
        default:
          return "";
      }
    } else if (analyzingStep === "analyzing") {
      switch (analyzingDocType) {
        case "guia":
          return "A inteligência artificial está extraindo as informações da guia.";
        case "descricao":
          return "A inteligência artificial está extraindo as informações da descrição cirúrgica.";
        case "honorarios":
          return "A inteligência artificial está extraindo as informações da guia de faturamento de honorários.";
        default:
          return "";
      }
    }
    return "Gravando os dados extraídos no sistema.";
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#F5F5F5] relative overflow-hidden">
      {/* Fundo premium */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.10)_0,#0b0b0b_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-[#121212]/80" />

      <div className="relative z-10 flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {(view === "hospital" || view === "upload_guia" || view === "upload_descricao" || view === "upload_honorarios" || view === "success") && (
          <>
            <p className="mb-3 text-sm font-semibold text-[#D4A017] sm:text-base">
              {saudacao}
            </p>

            <header className="mb-5 flex items-center justify-between gap-3">
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-xs text-[#F5F5F5] shadow-sm border border-[#D4A017]/20 hover:border-[#D4A017]/40 transition-colors"
                onClick={
                  view === "hospital"
                    ? () => {
                        setView("start");
                        setStep(1);
                      }
                    : view === "upload_guia"
                    ? () => {
                        setView("hospital");
                        setStep(1);
                      }
                    : view === "upload_descricao"
                      ? () => {
                          setView("upload_guia");
                        }
                      : view === "upload_honorarios"
                        ? () => {
                            setView("upload_descricao");
                          }
                        : () => navigate("/medico/dashboard")
                }
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar</span>
              </button>

              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 rounded-full bg-[#D4A017]/10 px-3 py-1.5 text-[11px] text-[#D4A017] border border-[#D4A017]/25">
                  <span className="h-2 w-2 rounded-full bg-[#D4A017] shadow-[0_0_8px_rgba(212,160,23,0.8)]" />
                  <span>
                    {view === "hospital"
                      ? "Passo 1/6"
                      : view === "upload_guia"
                      ? "Passo 2/6"
                      : view === "upload_descricao"
                        ? "Passo 3/6"
                        : view === "upload_honorarios"
                          ? "Passo 4/6"
                          : "Envio Concluído"}
                  </span>
                </div>
                {(view === "hospital" || view === "upload_guia" || view === "upload_descricao" || view === "upload_honorarios") && (
                  <span className="text-[11px] text-[#D4A017] pr-1">
                    {view === "hospital"
                      ? "Selecionar Instituições"
                      : view === "upload_guia"
                      ? "Guia de Autorização de Cirurgia"
                      : view === "upload_descricao"
                        ? "Descrição Cirúrgica"
                        : "Guia de Faturamento de Honorários"}
                  </span>
                )}
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
                            Cirurgia realizada em:
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

                    <button
                      type="button"
                      onClick={handleAbrirListaClinicas}
                      disabled={
                        useSameAsHospital ||
                        loadingClinicas ||
                        (!clinicasMedico.length && !selectedClinicaId)
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
                                ? "Carregando instituições..."
                                : clinicasMedico.length
                                  ? "Selecionar Instituição"
                                  : "Nenhuma instituição disponível")}
                          </span>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
                    </button>

                    {/* Checkbox "Mesmo hospital que foi realizada a cirurgia" (agora abaixo do campo) */}
                    <label className="mt-3 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSameAsHospital}
                        onChange={(e) => handleUseSameAsHospitalChange(e.target.checked)}
                        disabled={!selectedHospitalId}
                        className="h-4 w-4 rounded border-[#D4A017]/30 bg-[#121212] text-[#D4A017] focus:ring-[#D4A017]/50 focus:ring-offset-0 disabled:opacity-50"
                      />
                      <span className="text-[11px] text-[#9CA3AF]">
                        Mesma instituição que foi realizada a cirurgia
                      </span>
                    </label>
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
                    Selecione a instituição para faturamento:
                  </p>

                  <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {loadingClinicas && (
                      <p className="text-xs text-[#9CA3AF]">
                        Carregando instituições...
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
                        Não encontramos instituições disponíveis.
                        Entre em contato com o administrador.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TELA 2 - UPLOAD GUIA DE AUTORIZAÇÃO */}
          {view === "upload_guia" && (
            <div className="mt-2 flex w-full max-w-md flex-col">
              <Input
                id="files-upload-guia"
                ref={fileInputRefGuia}
                type="file"
                multiple
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleFileChangeGuia}
              />

              <div className="mb-6">
                <h1 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl">
                  {medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}
                </h1>
                <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
                  {filesGuia.length === 0 ? (
                    <>
                      <span>
                        Faça upload das imagens da Guia de Autorização de Cirurgia.
                      </span>
                      <br />
                      <span className="text-[11px] text-[#6B7280] sm:text-xs">
                        Obs: Tire várias imagens com os detalhes dos campos da mesma
                        guia para melhor análise da IA
                      </span>
                    </>
                  ) : (
                    "Confira os arquivos antes de enviar a Guia de Autorização de Cirurgia"
                  )}
                </p>
              </div>

              {filesGuia.length === 0 ? (
                <>
                  <label
                    htmlFor="files-upload-guia"
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
                      onClick={handleAdicionarMaisGuia}
                    >
                      + Adicionar mais
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {filesGuia.map((file, index) => (
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
                          onClick={() => handleRemoverArquivoGuia(index)}
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
                    disabled={isUploading || filesGuia.length === 0}
                    onClick={handleUploadGuiaAutorizacao}
                  >
                    {isUploading ? "Processando..." : "Continuar Envio"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
                    onClick={handleNovaDescricao}
                    disabled={isUploading}
                  >
                    Voltar para Novo Faturamento
                  </Button>

                </>
              )}
            </div>
          )}

          {/* TELA 3 - UPLOAD DESCRIÇÃO CIRÚRGICA */}
          {view === "upload_descricao" && (
            <div className="mt-2 flex w-full max-w-md flex-col">
              <Input
                id="files-upload-descricao"
                ref={fileInputRefDescricao}
                type="file"
                multiple
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleFileChangeDescricao}
              />

              <div className="mb-6">
                <h1 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl">
                  {medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}
                </h1>
                <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
                  {filesDescricao.length === 0 ? (
                    <>
                      <span>
                        Faça upload das imagens da Descrição Cirúrgica.
                      </span>
                      <br />
                      <span className="text-[11px] text-[#6B7280] sm:text-xs">
                        Obs: Tire várias imagens com os detalhes dos campos da mesma
                        descrição para melhor análise da IA
                      </span>
                    </>
                  ) : (
                    "Confira os arquivos antes de enviar a Descrição Cirúrgica"
                  )}
                </p>
              </div>

              {filesDescricao.length === 0 ? (
                <>
                  <label
                    htmlFor="files-upload-descricao"
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
                      Seus Arquivos ({filesDescricao.length === 1 ? "1 arquivo" : `${filesDescricao.length} arquivos`})
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full border-[#D4A017]/30 bg-black/40 text-[11px] font-semibold text-[#D4A017] hover:bg-[#D4A017]/10 hover:text-[#FFD700]"
                      onClick={handleAdicionarMaisDescricao}
                    >
                      + Adicionar mais
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {filesDescricao.map((file, index) => (
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
                          onClick={() => handleRemoverArquivoDescricao(index)}
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
                    disabled={isUploading || filesDescricao.length === 0}
                    onClick={handleUploadDescricaoCirurgica}
                  >
                    {isUploading ? "Processando..." : "Continuar Envio"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
                    onClick={() => setView("upload_guia")}
                    disabled={isUploading}
                  >
                    Voltar para Guia de Autorização
                  </Button>
                </>
              )}
            </div>
          )}

          {/* TELA 4 - UPLOAD GUIA DE FATURAMENTO DE HONORÁRIOS */}
          {view === "upload_honorarios" && (
            <div className="mt-2 flex w-full max-w-md flex-col">
              <Input
                id="files-upload-honorarios"
                ref={fileInputRefHonorarios}
                type="file"
                multiple
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleFileChangeHonorarios}
              />

              <div className="mb-6">
                <h1 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl">
                  {medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}
                </h1>
                <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
                  {filesHonorarios.length === 0 ? (
                    <>
                      <span>
                        Faça upload das imagens da Guia de Faturamento de Honorários.
                      </span>
                      <br />
                      <span className="text-[11px] text-[#6B7280] sm:text-xs">
                        Obs: Tire várias imagens com os detalhes dos campos da mesma
                        guia para melhor análise da IA
                      </span>
                    </>
                  ) : (
                    "Confira os arquivos antes de enviar a Guia de Faturamento de Honorários"
                  )}
                </p>
              </div>

              {filesHonorarios.length === 0 ? (
                <>
                  <label
                    htmlFor="files-upload-honorarios"
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
                      Seus Arquivos ({filesHonorarios.length === 1 ? "1 arquivo" : `${filesHonorarios.length} arquivos`})
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full border-[#D4A017]/30 bg-black/40 text-[11px] font-semibold text-[#D4A017] hover:bg-[#D4A017]/10 hover:text-[#FFD700]"
                      onClick={handleAdicionarMaisHonorarios}
                    >
                      + Adicionar mais
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {filesHonorarios.map((file, index) => (
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
                          onClick={() => handleRemoverArquivoHonorarios(index)}
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
                    disabled={isUploading || filesHonorarios.length === 0}
                    onClick={handleUploadGuiaHonorarios}
                  >
                    {isUploading ? "Processando..." : "Finalizar Envio"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
                    onClick={() => setView("upload_descricao")}
                    disabled={isUploading}
                  >
                    Voltar para Descrição Cirúrgica
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
                      Os documentos foram enviados e processados com sucesso.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      type="button"
                      className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
                      onClick={handleNovaDescricao}
                    >
                      Novo Faturamento
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                      onClick={() => navigate("/medico/dashboard")}
                    >
                      Ir para o Início
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>


      {/* Tela de Análise da IA */}
      {showAnalyzingScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="flex w-full max-w-sm flex-col items-center px-6 py-10 text-center">
            {/* Ícone animado */}
            <div className="relative mb-7 flex h-24 w-24 items-center justify-center rounded-[32px] bg-gradient-to-br from-[#FFD700] via-[#D4A017] to-[#B8860B] shadow-[0_0_60px_rgba(212,160,23,0.35)]">
              <div className="absolute inset-1 rounded-[26px] bg-black/60 backdrop-blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#121212] border border-[#D4A017]/20 shadow-[0_10px_40px_rgba(0,0,0,0.65)]">
                {analyzingStep === "uploading" ? (
                  <Upload className="h-8 w-8 text-[#D4A017] animate-pulse" />
                ) : analyzingStep === "analyzing" ? (
                  <Brain className="h-8 w-8 text-[#D4A017] animate-pulse" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-[#D4A017]" />
                )}
              </div>
            </div>

            <h2 className="text-base font-semibold text-[#F5F5F5] sm:text-lg">
              {analyzingStep === "uploading"
                ? "Enviando Imagens..."
                : analyzingStep === "analyzing"
                  ? "Analisando com IA..."
                  : "Salvando Dados..."}
            </h2>
            <p className="mt-2 text-[11px] text-[#9CA3AF] sm:text-xs max-w-xs">
              {getAnalyzingStepDescription()}
            </p>

            {/* Barra de progresso real */}
            <div className="mt-6 w-full max-w-xs">
              <Progress value={analyzingProgress} className="h-2.5 rounded-full" />
              <p className="mt-2 text-[10px] text-[#6B7280]">
                {analyzingProgress}% concluído
              </p>
            </div>

            {/* Título do documento sendo processado */}
            <p className="mt-4 text-[10px] text-[#D4A017] font-medium">
              {getAnalyzingDocTitle()}
            </p>

            {/* Etapas do processo */}
            <div className="mt-4 w-full max-w-xs rounded-2xl border border-[#D4A017]/15 bg-black/70 p-4 text-left text-[11px] text-[#9CA3AF] shadow-[0_18px_50px_rgba(0,0,0,0.75)] sm:text-xs">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      analyzingProgress >= 30
                        ? "bg-[#D4A017] text-black"
                        : "bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/25"
                    }`}
                  >
                    {analyzingProgress >= 30 ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                  </span>
                  <span
                    className={
                      analyzingStep === "uploading"
                        ? "font-medium text-[#F5F5F5]"
                        : "text-[#9CA3AF]"
                    }
                  >
                    Upload das imagens
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      analyzingProgress >= 80
                        ? "bg-[#D4A017] text-black"
                        : analyzingStep === "analyzing"
                          ? "bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/25"
                          : "bg-black/50 text-[#6B7280] border border-[#6B7280]/25"
                    }`}
                  >
                    {analyzingProgress >= 80 ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : analyzingStep === "analyzing" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span className="text-[8px]">2</span>
                    )}
                  </span>
                  <span
                    className={
                      analyzingStep === "analyzing"
                        ? "font-medium text-[#F5F5F5]"
                        : analyzingProgress >= 80
                          ? "text-[#9CA3AF]"
                          : "text-[#6B7280]"
                    }
                  >
                    Análise da IA
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      analyzingProgress >= 100
                        ? "bg-[#D4A017] text-black"
                        : analyzingStep === "saving"
                          ? "bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/25"
                          : "bg-black/50 text-[#6B7280] border border-[#6B7280]/25"
                    }`}
                  >
                    {analyzingProgress >= 100 ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : analyzingStep === "saving" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span className="text-[8px]">3</span>
                    )}
                  </span>
                  <span
                    className={
                      analyzingStep === "saving"
                        ? "font-medium text-[#F5F5F5]"
                        : analyzingProgress >= 100
                          ? "text-[#9CA3AF]"
                          : "text-[#6B7280]"
                    }
                  >
                    Salvando no banco de dados
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicoUploadDescricaoCirurgica;