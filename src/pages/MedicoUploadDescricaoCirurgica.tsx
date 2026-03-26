import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
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
  Loader2,
  Brain,
  FileCheck,
  AlertCircle,
  Download,
  Calendar,
  Zap,
  TrendingUp,
  Scissors,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MEDICO_LOGO_URL } from "@/constants/medico-brand";
import { compressFiles } from "@/utils/image-compression";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  showError,
  showSuccess,
} from "@/utils/toast";
import { SendBillingEmailsDialog } from "@/components/faturamento/SendBillingEmailsDialog";
import ProcedureReviewDialog, { type ProcedimentoRevisao } from "@/components/faturamento/ProcedureReviewDialog";
import ConsistencyResultsTable from "@/components/faturamento/ConsistencyResultsTable";
import {
  checkAposSolicitacao,
  checkAposGuiaAutorizacao,
  checkAposDescricaoCirurgica,
  saveConsistencyResults,
  markResultsAsIgnored,
  type CheckResult,
} from "@/utils/consistencyCheck";
import { useBillingQuota } from "@/hooks/use-billing-quota";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type ViewState = 
  | "start" 
  | "hospital" 
  | "pergunta_solicitacao"
  | "upload_solicitacao"
  | "pergunta_guia_autorizacao"
  | "upload_guia" 
  | "upload_descricao" 
  | "pergunta_honorarios"
  | "gerando_honorarios"
  | "preview_honorarios"
  | "sem_modelo"
  | "success";

interface FaturamentoData {
  paciente_nome?: string;
  paciente_convenio?: string;
  paciente_carteirinha?: string;
  data_cirurgia?: string;
  hora_inicio?: string;
  hora_fim?: string;
  cirurgiao_principal_nome?: string;
  cirurgiao_principal_crm?: string;
  auxiliar1_nome?: string;
  auxiliar1_crm?: string;
  auxiliar2_nome?: string;
  auxiliar2_crm?: string;
  auxiliar3_nome?: string;
  auxiliar3_crm?: string;
  anestesista_nome?: string;
  anestesista_crm?: string;
  instrumentador_nome?: string;
  instrumentador_crm?: string;
}

interface ItemFaturamento {
  codigo_procedimento?: string;
  descricao_procedimento?: string;
  quantidade?: number;
}

type UploadItem = {
  data: Blob;
  contentType: string;
  suggestedName: string;
};

const isPdfFile = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

const isUnsupportedRawFormat = (file: File) => {
  const rawExtensions = [".dng", ".cr2", ".cr3", ".nef", ".arw", ".orf", ".rw2", ".raf", ".raw"];
  const name = file.name.toLowerCase();
  return rawExtensions.some((ext) => name.endsWith(ext));
};

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

const pdfToPngUploadItems = async (pdfFile: File): Promise<UploadItem[]> => {
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

    await (page.render({ canvasContext: ctx, viewport, canvas } as any).promise as Promise<void>);

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

const expandFilesToUploadItems = async (files: File[]): Promise<UploadItem[]> => {
  const items: UploadItem[] = [];

  for (const file of files) {
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

const MedicoUploadDescricaoCirurgica: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hospitalId, faturamentoId: initialFaturamentoId, initialView } = (location.state ?? {}) as {
    hospitalId?: string;
    faturamentoId?: string;
    initialView?: ViewState | "email_faturamento";
  };

  // Quota de faturamentos mensais
  const billingQuota = useBillingQuota();

  // Arquivos da Guia de Autorização
  const [filesGuia, setFilesGuia] = useState<File[]>([]);
  // Arquivos da Guia de Solicitação
  const [filesSolicitacao, setFilesSolicitacao] = useState<File[]>([]);
  // Arquivos da Descrição Cirúrgica
  const [filesDescricao, setFilesDescricao] = useState<File[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [medicoNome, setMedicoNome] = useState<string>("");
  const [medicoEmail, setMedicoEmail] = useState<string>("");
  const [medicoCrm, setMedicoCrm] = useState<string>("");
  const [view, setView] = useState<ViewState>("start");
  const fileInputRefGuia = useRef<HTMLInputElement | null>(null);
  const fileInputRefSolicitacao = useRef<HTMLInputElement | null>(null);
  const fileInputRefDescricao = useRef<HTMLInputElement | null>(null);

  // Tela de análise da IA
  const [showAnalyzingScreen, setShowAnalyzingScreen] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [analyzingStep, setAnalyzingStep] = useState<"uploading" | "analyzing" | "saving">("uploading");
  const [analyzingDocType, setAnalyzingDocType] = useState<"solicitacao" | "guia" | "descricao" | "honorarios">("guia");

  // ID do faturamento criado no início do fluxo (fica INATIVO até registrar guia de autorização)
  const [faturamentoId, setFaturamentoId] = useState<string | null>(null);

  // ID do usuário autenticado (preenchido ao fazer upload)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Dados do faturamento para preencher a guia de honorários
  const [faturamentoData, setFaturamentoData] = useState<FaturamentoData | null>(null);
  const [itensFaturamento, setItensFaturamento] = useState<ItemFaturamento[]>([]);

  // HTML da guia de honorários preenchida
  const [htmlGuiaPreenchida, setHtmlGuiaPreenchida] = useState<string>("");
  const [guiaHonorariosId, setGuiaHonorariosId] = useState<string | null>(null);

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

  // Ref para o container do preview da guia (para gerar PDF)
  const guiaPreviewRef = useRef<HTMLDivElement | null>(null);

  // Estado para controlar geração do PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Estado para controlar se o PDF já foi gerado e URL para download
  const [pdfGerado, setPdfGerado] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // Estado para o diálogo de envio de emails
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  // Estado para o diálogo de revisão de procedimentos
  const [showProcedureReview, setShowProcedureReview] = useState(false);
  const [procedimentosRevisao, setProcedimentosRevisao] = useState<ProcedimentoRevisao[]>([]);

  // Zoom do preview da guia de honorários (inicia em 50%)
  const [guiaZoom, setGuiaZoom] = useState(0.5);
  const ZOOM_STEP = 0.15;
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 2.0;

  // Tipo de cirurgia (eletiva ou emergencial)
  const [tipoCirurgia, setTipoCirurgia] = useState<"ELETIVA" | "EMERGENCIAL" | null>(null);

  // Verificação de consistência entre documentos
  const [consistencyCheckEnabled, setConsistencyCheckEnabled] = useState(false);
  const [allConsistencyResults, setAllConsistencyResults] = useState<CheckResult[]>([]);
  const [showConsistencyTable, setShowConsistencyTable] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Flags de controle de documentos enviados (persistem após upload)
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false);
  const [autorizacaoEnviada, setAutorizacaoEnviada] = useState(false);

  // Limpar URL do blob quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  // Pré-selecionar caráter da cirurgia ao entrar na tela de pergunta de autorização
  useEffect(() => {
    if (view !== "pergunta_guia_autorizacao") return;
    if (tipoCirurgia) return; // já selecionado pelo usuário, não sobrescrever
    if (!faturamentoId) return;

    supabase
      .from("faturamentos")
      .select("carater_cirurgia")
      .eq("id", faturamentoId)
      .maybeSingle()
      .then(({ data }) => {
        const carater = (data as any)?.carater_cirurgia;
        if (carater === "ELETIVA" || carater === "EMERGENCIAL") {
          setTipoCirurgia(carater);
        }
      });
  }, [view, faturamentoId]);

  // Auto: ao entrar no preview da guia, já gera o PDFcy automaticamente
  useEffect(() => {
    if (view !== "preview_honorarios") return;
    if (pdfGerado || isGeneratingPdf) return;
    if (!guiaHonorariosId || !htmlGuiaPreenchida) return;

    void handleGerarPdf({
      guiaHonorariosIdOverride: guiaHonorariosId,
      htmlOverride: htmlGuiaPreenchida,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, pdfGerado, isGeneratingPdf, guiaHonorariosId, htmlGuiaPreenchida]);

  // Carrega o nome do médico logado para exibir na saudação
  useEffect(() => {
    const carregarNomeMedico = async () => {
      const { data: authData } = await supabase.auth.getUser();

      const email = authData.user?.email;
      if (!email) return;

      setMedicoEmail(email);

      const { data, error } = await supabase
        .from("usuarios_sistema")
        .select("nome, crm")
        .eq("email", email)
        .maybeSingle();

      if (!error && data?.nome) {
        const primeiroNome = (data.nome as string).split(" ")[0];
        setMedicoNome(primeiroNome);
      }

      if (!error && data?.crm) {
        setMedicoCrm(String(data.crm));
      }
    };

    void carregarNomeMedico();
  }, []);

  // Retomar faturamento existente (vindo dos botões de "Enviar documento")
  useEffect(() => {
    if (!initialFaturamentoId || !initialView) return;

    const retomar = async () => {
      // Carregar dados do faturamento para pré-preencher hospital/clínica
      const { data, error } = await supabase
        .from("faturamentos")
        .select("id, instituicao_cirurgia_id, instituicao_faturamento_id, hospital_nome")
        .eq("id", initialFaturamentoId)
        .single();

      if (error || !data) return;

      setFaturamentoId(data.id as string);

      if (data.instituicao_cirurgia_id) {
        setSelectedHospitalId(data.instituicao_cirurgia_id as string);
      }
      if (data.hospital_nome) {
        setSelectedHospitalName(data.hospital_nome as string);
      }

      // Buscar nome da instituição de faturamento
      if (data.instituicao_faturamento_id) {
        setSelectedClinicaId(data.instituicao_faturamento_id as string);

        const { data: clinicaData } = await supabase
          .from("clinicas")
          .select("nome_fantasia")
          .eq("id", data.instituicao_faturamento_id)
          .maybeSingle();

        if (clinicaData?.nome_fantasia) {
          setSelectedClinicaName(clinicaData.nome_fantasia as string);
        }
      }

      // Se hospital_nome não veio, buscar pelo instituicao_cirurgia_id
      if (!data.hospital_nome && data.instituicao_cirurgia_id) {
        const { data: hospitalData } = await supabase
          .from("clinicas")
          .select("nome_fantasia")
          .eq("id", data.instituicao_cirurgia_id)
          .maybeSingle();

        if (hospitalData?.nome_fantasia) {
          setSelectedHospitalName(hospitalData.nome_fantasia as string);
        }
      }

      if (initialView === "email_faturamento") {
        // Mostrar o diálogo de email diretamente
        setView("start");
        setShowEmailDialog(true);
      } else {
        setView(initialView as ViewState);
      }
    };

    void retomar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const hasRawFiles = selectedFiles.some(isUnsupportedRawFormat);
    if (hasRawFiles) {
      showError(
        "Arquivos RAW (.DNG, .CR2, .NEF, etc.) não são suportados. Por favor, tire fotos no formato JPEG/PNG ou exporte como PDF.",
      );
    }

    const allowedFiles = selectedFiles.filter(
      (file) =>
        (file.type.startsWith("image/") || file.type === "application/pdf") &&
        !isUnsupportedRawFormat(file),
    );
    const ignoredCount = selectedFiles.length - allowedFiles.length;

    if (ignoredCount > 0 && !hasRawFiles) {
      showError(
        "Alguns arquivos foram ignorados por não serem imagens ou PDFs. Envie apenas imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
      );
    }

    if (allowedFiles.length === 0) {
      setFilesGuia([]);
      if (!hasRawFiles) {
        showError(
          "Nenhum arquivo válido foi selecionado. Envie imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
        );
      }
      return;
    }

    compressFiles(allowedFiles).then((compressedFiles) => {
      setFilesGuia((prev) => [...prev, ...compressedFiles]);
    });
    event.target.value = "";
  };

  // Handler para arquivos da Descrição Cirúrgica
  const handleFileChangeDescricao = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const selectedFiles = Array.from(event.target.files);

    const hasRawFiles = selectedFiles.some(isUnsupportedRawFormat);
    if (hasRawFiles) {
      showError(
        "Arquivos RAW (.DNG, .CR2, .NEF, etc.) não são suportados. Por favor, tire fotos no formato JPEG/PNG ou exporte como PDF.",
      );
    }

    const allowedFiles = selectedFiles.filter(
      (file) =>
        (file.type.startsWith("image/") || file.type === "application/pdf") &&
        !isUnsupportedRawFormat(file),
    );
    const ignoredCount = selectedFiles.length - allowedFiles.length;

    if (ignoredCount > 0 && !hasRawFiles) {
      showError(
        "Alguns arquivos foram ignorados por não serem imagens ou PDFs. Envie apenas imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
      );
    }

    if (allowedFiles.length === 0) {
      setFilesDescricao([]);
      if (!hasRawFiles) {
        showError(
          "Nenhum arquivo válido foi selecionado. Envie imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
        );
      }
      return;
    }

    compressFiles(allowedFiles).then((compressedFiles) => {
      setFilesDescricao((prev) => [...prev, ...compressedFiles]);
    });
    event.target.value = "";
  };

  // Handler para arquivos da Guia de Solicitação
  const handleFileChangeSolicitacao = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const selectedFiles = Array.from(event.target.files);

    const hasRawFiles = selectedFiles.some(isUnsupportedRawFormat);
    if (hasRawFiles) {
      showError(
        "Arquivos RAW (.DNG, .CR2, .NEF, etc.) não são suportados. Por favor, tire fotos no formato JPEG/PNG ou exporte como PDF.",
      );
    }

    const allowedFiles = selectedFiles.filter(
      (file) =>
        (file.type.startsWith("image/") || file.type === "application/pdf") &&
        !isUnsupportedRawFormat(file),
    );
    const ignoredCount = selectedFiles.length - allowedFiles.length;

    if (ignoredCount > 0 && !hasRawFiles) {
      showError(
        "Alguns arquivos foram ignorados por não serem imagens ou PDFs. Envie apenas imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
      );
    }

    if (allowedFiles.length === 0) {
      setFilesSolicitacao([]);
      if (!hasRawFiles) {
        showError(
          "Nenhum arquivo válido foi selecionado. Envie imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
        );
      }
      return;
    }

    compressFiles(allowedFiles).then((compressedFiles) => {
      setFilesSolicitacao((prev) => [...prev, ...compressedFiles]);
    });
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

  // Função para upload e análise da Guia de Solicitação
  const handleUploadGuiaSolicitacao = async () => {
    if (filesSolicitacao.length === 0) {
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
    setAnalyzingDocType("solicitacao");

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

      const ensuredFaturamentoId = await upsertFaturamentoParcial({
        instituicaoCirurgiaId: selectedHospitalId,
        instituicaoFaturamentoId: selectedClinicaId,
        hospitalNome: selectedHospitalName,
        instituicaoFaturamentoNome: selectedClinicaName,
      });

      if (!ensuredFaturamentoId) {
        throw new Error("Não foi possível criar o faturamento.");
      }

      setAnalyzingProgress(10);

      let uploadItems: UploadItem[] = [];
      try {
        uploadItems = await expandFilesToUploadItems(filesSolicitacao);
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Não foi possível ler o PDF. Tente novamente.";
        throw new Error(msg);
      }

      if (uploadItems.length === 0) {
        throw new Error("Nenhum arquivo válido foi gerado para envio.");
      }

      for (let i = 0; i < uploadItems.length; i++) {
        const item = uploadItems[i];
        const safeName = sanitizeFileName(item.suggestedName);
        const timestamp = Date.now();
        const filePath = `guia_solicitacao/${userId}/${timestamp}-${safeName}`;

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
        setAnalyzingProgress(10 + Math.round(((i + 1) / uploadItems.length) * 20));
      }

      setAnalyzingStep("analyzing");
      setAnalyzingProgress(35);

      const functionUrl =
        "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-guia-solicitacao";

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
        // ignore
      }

      if (!response.ok || responseJson?.error) {
        const errorMessage =
          responseJson?.error ?? "Houve erro ao processar a guia de solicitação.";
        throw new Error(errorMessage);
      }

      setAnalyzingStep("saving");
      setAnalyzingProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fechar overlay primeiro para evitar erro removeChild no DOM
      setShowAnalyzingScreen(false);
      setSolicitacaoEnviada(true);

      if (consistencyCheckEnabled) {
        // Buscar guia_solicitacao_id do faturamento
        const { data: fatForSolCheck } = await supabase
          .from("faturamentos")
          .select("guia_solicitacao_id")
          .eq("id", ensuredFaturamentoId)
          .single();
        const guiaSolIdCheck = (fatForSolCheck as any)?.guia_solicitacao_id;

        if (guiaSolIdCheck) {
          const { data: solData } = await supabase
            .from("guia_solicitacao")
            .select("id, nome_beneficiario, profissional_nome, profissional_numero_conselho")
            .eq("id", guiaSolIdCheck)
            .maybeSingle();

          if (solData) {
            // Buscar itens (códigos de procedimentos + hora_inicial)
            const { data: solItens } = await supabase
              .from("itens_guia_solicitacao")
              .select("codigo_procedimento, hora_inicial")
              .eq("guia_id", (solData as any).id);
            const horaInicial = (solItens ?? []).find((it: any) => it.hora_inicial)?.hora_inicial ?? null;
            const solProcCodes = (solItens ?? [])
              .map((it: any) => it.codigo_procedimento)
              .filter(Boolean);

            const results = checkAposSolicitacao(
              {
                nome_beneficiario: (solData as any).nome_beneficiario,
                hora_inicial: horaInicial,
                profissional_nome: (solData as any).profissional_nome,
                profissional_numero_conselho: (solData as any).profissional_numero_conselho,
              },
              solProcCodes
            );
            setAllConsistencyResults(prev => [...prev, ...results]);
            const uid = (await supabase.auth.getUser()).data.user?.id;
            if (uid) {
              await saveConsistencyResults(ensuredFaturamentoId, uid, "apos_solicitacao", results);
            }
          }
        }
      }

      // Mudar view primeiro (desmonta a lista de arquivos), depois limpar array, toast por último
      if (initialFaturamentoId) {
        navigate("/medico/faturamentos");
      } else {
        setView("pergunta_guia_autorizacao");
      }
      setFilesSolicitacao([]);
      showSuccess("Guia de solicitação processada com sucesso!");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível processar a guia de solicitação.";
      showError(message);
      setShowAnalyzingScreen(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinuarParaUploadGuiaAutorizacao = () => {
    if (!tipoCirurgia) {
      showError("Selecione o tipo de cirurgia antes de continuar.");
      return;
    }

    setView("upload_guia");
    setTimeout(() => fileInputRefGuia.current?.click(), 100);
  };

  const handlePularGuiaAutorizacao = async () => {
    if (!tipoCirurgia) {
      showError("Selecione o tipo de cirurgia antes de continuar.");
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

    try {
      const ensuredFaturamentoId = await upsertFaturamentoParcial({
        instituicaoCirurgiaId: selectedHospitalId,
        instituicaoFaturamentoId: selectedClinicaId,
        hospitalNome: selectedHospitalName,
        instituicaoFaturamentoNome: selectedClinicaName,
      });

      if (!ensuredFaturamentoId) {
        throw new Error("Não foi possível encontrar/criar o faturamento.");
      }

      const { error } = await supabase
        .from("faturamentos")
        .update({
          tipo_cirurgia: tipoCirurgia,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ensuredFaturamentoId);

      if (error) throw error;

      showSuccess("Tipo de cirurgia salvo. Continuando sem guia de autorização.");
      if (initialFaturamentoId) {
        navigate("/medico/faturamentos");
      } else {
        setView("upload_descricao");
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o tipo de cirurgia.";
      showError(message);
    } finally {
      setIsUploading(false);
    }
  };

  // Função para upload e análise da Guia de Autorização
  const handleUploadGuiaAutorizacao = async () => {
    if (filesGuia.length === 0) {
      showError("Selecione pelo menos um arquivo para enviar.");
      return;
    }

    if (!tipoCirurgia) {
      showError("Selecione o tipo de cirurgia antes de continuar.");
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

      const ensuredFaturamentoId = await upsertFaturamentoParcial({
        instituicaoCirurgiaId: selectedHospitalId,
        instituicaoFaturamentoId: selectedClinicaId,
        hospitalNome: selectedHospitalName,
        instituicaoFaturamentoNome: selectedClinicaName,
      });

      if (!ensuredFaturamentoId) {
        throw new Error("Não foi possível criar o faturamento.");
      }

      const { error: tipoError } = await supabase
        .from("faturamentos")
        .update({
          tipo_cirurgia: tipoCirurgia,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ensuredFaturamentoId);

      if (tipoError) {
        throw new Error(tipoError.message || "Não foi possível salvar o tipo de cirurgia.");
      }

      setAnalyzingProgress(10);

      let uploadItems: UploadItem[] = [];
      try {
        uploadItems = await expandFilesToUploadItems(filesGuia);
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Não foi possível ler o PDF. Tente novamente.";
        throw new Error(msg);
      }

      if (uploadItems.length === 0) {
        throw new Error("Nenhum arquivo válido foi gerado para envio.");
      }

      for (let i = 0; i < uploadItems.length; i++) {
        const item = uploadItems[i];
        const safeName = sanitizeFileName(item.suggestedName);
        const timestamp = Date.now();
        const filePath = `guia_autorizacao_cirurgia/${userId}/${timestamp}-${safeName}`;

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
        setAnalyzingProgress(10 + Math.round(((i + 1) / uploadItems.length) * 20));
      }

      setAnalyzingStep("analyzing");
      setAnalyzingProgress(35);

      // ── Snapshot ANTES de chamar a edge function (dados da autorização) ──
      let autSnapshot: Record<string, any> | null = null;
      let autProcCodes: string[] = [];

      if (consistencyCheckEnabled && autorizacaoEnviada) {
        const { data: snapRow } = await supabase
          .from("faturamentos")
          .select("paciente_nome, data_cirurgia, hora_inicio, hora_fim, cirurgiao_principal_nome, cirurgiao_principal_crm, auxiliar1_nome, auxiliar1_crm, auxiliar2_nome, auxiliar2_crm, auxiliar3_nome, auxiliar3_crm, anestesista_nome, anestesista_crm, instrumentador_nome, instrumentador_crm")
          .eq("id", faturamentoId)
          .single();
        if (snapRow) autSnapshot = snapRow;

        const { data: snapItens } = await supabase
          .from("itens_faturamento")
          .select("codigo_procedimento")
          .eq("faturamento_id", faturamentoId);
        autProcCodes = (snapItens ?? [])
          .map((it: any) => it.codigo_procedimento)
          .filter(Boolean);
      }

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
          tipoCirurgia,
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
          responseJson?.error ?? "Houve erro ao processar a guia de autorização.";
        throw new Error(errorMessage);
      }

      setAnalyzingStep("saving");
      setAnalyzingProgress(85);

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

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fechar overlay primeiro para evitar erro removeChild no DOM
      setShowAnalyzingScreen(false);
      setAutorizacaoEnviada(true);

      // Sincronizar carater_cirurgia extraído pela IA com o estado local
      {
        const { data: fatCarater } = await supabase
          .from("faturamentos")
          .select("carater_cirurgia")
          .eq("id", ensuredFaturamentoId)
          .maybeSingle();
        const caraterExtraido = (fatCarater as any)?.carater_cirurgia;
        if (caraterExtraido === "ELETIVA" || caraterExtraido === "EMERGENCIAL") {
          setTipoCirurgia(caraterExtraido);
        }
      }

      if (consistencyCheckEnabled) {
        const { data: fatData } = await supabase
          .from("faturamentos")
          .select("paciente_nome, cirurgiao_principal_nome, cirurgiao_principal_crm")
          .eq("id", ensuredFaturamentoId)
          .single();

        let solData: { nome_beneficiario?: string | null; numero_carteira?: string | null; contratado_cnes?: string | null } | null = null;
        if (solicitacaoEnviada) {
          // Buscar guia_solicitacao_id do faturamento
          const { data: fatForSol } = await supabase
            .from("faturamentos")
            .select("guia_solicitacao_id")
            .eq("id", ensuredFaturamentoId)
            .single();
          const guiaSolId = (fatForSol as any)?.guia_solicitacao_id;
          if (guiaSolId) {
            const { data: sol } = await supabase
              .from("guia_solicitacao")
              .select("nome_beneficiario, numero_carteira, contratado_cnes")
              .eq("id", guiaSolId)
              .maybeSingle();
            solData = sol as typeof solData;
          }
        }

        if (fatData) {
          // Buscar códigos de procedimentos da autorização
          const { data: autItens } = await supabase
            .from("itens_faturamento")
            .select("codigo_procedimento")
            .eq("faturamento_id", ensuredFaturamentoId);
          const autProcCodesCheck = (autItens ?? [])
            .map((it: any) => it.codigo_procedimento)
            .filter(Boolean);

          // Buscar dados da solicitação para cruzamento
          let solDataForAut: { nome_beneficiario?: string | null; hora_inicial?: string | null; profissional_nome?: string | null; profissional_numero_conselho?: string | null } | null = null;
          let solProcCodesForAut: string[] = [];
          if (solicitacaoEnviada) {
            // Buscar guia_solicitacao_id do faturamento
            const { data: fatForSol2 } = await supabase
              .from("faturamentos")
              .select("guia_solicitacao_id")
              .eq("id", ensuredFaturamentoId)
              .single();
            const guiaSolId2 = (fatForSol2 as any)?.guia_solicitacao_id;
            if (guiaSolId2) {
              const { data: solRow } = await supabase
                .from("guia_solicitacao")
                .select("id, nome_beneficiario, profissional_nome, profissional_numero_conselho")
                .eq("id", guiaSolId2)
                .maybeSingle();
              if (solRow) {
                const { data: solItens3 } = await supabase
                  .from("itens_guia_solicitacao")
                  .select("codigo_procedimento, hora_inicial")
                  .eq("guia_id", (solRow as any).id);
                const horaInicial3 = (solItens3 ?? []).find((it: any) => it.hora_inicial)?.hora_inicial ?? null;
                solDataForAut = {
                  nome_beneficiario: (solRow as any).nome_beneficiario,
                  hora_inicial: horaInicial3,
                  profissional_nome: (solRow as any).profissional_nome,
                  profissional_numero_conselho: (solRow as any).profissional_numero_conselho,
                };
                solProcCodesForAut = (solItens3 ?? [])
                  .map((it: any) => it.codigo_procedimento)
                  .filter(Boolean);
              }
            }
          }

          const results = checkAposGuiaAutorizacao(
            {
              paciente_nome: (fatData as any).paciente_nome,
              cirurgiao_nome: (fatData as any).cirurgiao_principal_nome,
              cirurgiao_principal_crm: (fatData as any).cirurgiao_principal_crm,
            },
            autProcCodesCheck,
            solDataForAut,
            solProcCodesForAut
          );
          setAllConsistencyResults(prev => [...prev, ...results]);
          const uid = (await supabase.auth.getUser()).data.user?.id;
          if (uid) {
            await saveConsistencyResults(ensuredFaturamentoId, uid, "apos_guia_autorizacao", results);
          }
        }
      }

      // Mudar view primeiro (desmonta a lista de arquivos), depois limpar array, toast por último
      if (initialFaturamentoId) {
        navigate("/medico/faturamentos");
      } else {
        setView("upload_descricao");
      }
      setFilesGuia([]);
      showSuccess("Guia de autorização processada com sucesso!");
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

  // Função para upload e análise da Descrição Cirúrgica
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
      setCurrentUserId(userId);
      const bucketName = "NPS-pro";

      setAnalyzingProgress(10);

      let uploadItems: UploadItem[] = [];
      try {
        uploadItems = await expandFilesToUploadItems(filesDescricao);
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Não foi possível ler o PDF. Tente novamente.";
        throw new Error(msg);
      }

      if (uploadItems.length === 0) {
        throw new Error("Nenhum arquivo válido foi gerado para envio.");
      }

      for (let i = 0; i < uploadItems.length; i++) {
        const item = uploadItems[i];
        const safeName = sanitizeFileName(item.suggestedName);
        const timestamp = Date.now();
        const filePath = `descricao_cirurgica/${userId}/${timestamp}-${safeName}`;

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
        setAnalyzingProgress(10 + Math.round(((i + 1) / uploadItems.length) * 20));
      }

      setAnalyzingStep("analyzing");
      setAnalyzingProgress(35);

      // ── Snapshot ANTES de chamar a edge function (dados da autorização) ──
      let autSnapshot: Record<string, any> | null = null;
      let autProcCodes: string[] = [];

      if (consistencyCheckEnabled && autorizacaoEnviada) {
        const { data: snapRow } = await supabase
          .from("faturamentos")
          .select("paciente_nome, data_cirurgia, hora_inicio, hora_fim, cirurgiao_principal_nome, cirurgiao_principal_crm, auxiliar1_nome, auxiliar1_crm, auxiliar2_nome, auxiliar2_crm, auxiliar3_nome, auxiliar3_crm, anestesista_nome, anestesista_crm, instrumentador_nome, instrumentador_crm")
          .eq("id", faturamentoId)
          .single();
        if (snapRow) autSnapshot = snapRow;

        const { data: snapItens } = await supabase
          .from("itens_faturamento")
          .select("codigo_procedimento")
          .eq("faturamento_id", faturamentoId);
        autProcCodes = (snapItens ?? [])
          .map((it: any) => it.codigo_procedimento)
          .filter(Boolean);
      }

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
          responseJson?.error ?? "Houve erro ao processar a descrição cirúrgica.";
        throw new Error(errorMessage);
      }

      setAnalyzingStep("saving");
      setAnalyzingProgress(85);

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

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fechar overlay primeiro para evitar erro removeChild no DOM
      setShowAnalyzingScreen(false);

      // Check if any procedures need review
      const revisaoData = responseJson?.revisao_procedimentos as ProcedimentoRevisao[] | undefined;
      const temRevisao = responseJson?.tem_revisao_pendente === true;

      if (consistencyCheckEnabled) {
        // Ler faturamento ATUALIZADO (após edge function salvar dados da descrição)
        const { data: descFatRow } = await supabase
          .from("faturamentos")
          .select("paciente_nome, hora_inicio, cirurgiao_principal_nome, cirurgiao_principal_crm")
          .eq("id", faturamentoId)
          .single();

        // Ler itens de faturamento ATUALIZADOS (após edge function inserir/atualizar procedimentos)
        const { data: descItens } = await supabase
          .from("itens_faturamento")
          .select("codigo_procedimento")
          .eq("faturamento_id", faturamentoId);
        const descProcCodesFromDb = (descItens ?? [])
          .map((it: any) => it.codigo_procedimento)
          .filter(Boolean);

        // Also include validated codes from revisao_procedimentos (pending review items
        // that haven't been inserted into itens_faturamento yet)
        const descProcCodesFromRevisao = (revisaoData ?? [])
          .map((r: any) => r.codigo_validado)
          .filter(Boolean);

        // Merge both sources, deduplicate
        const descProcCodes = [...new Set([...descProcCodesFromDb, ...descProcCodesFromRevisao])];

        // Buscar dados da solicitação se enviada
        let solDataForCheck: { nome_beneficiario?: string | null; hora_inicial?: string | null; profissional_nome?: string | null; profissional_numero_conselho?: string | null } | null = null;
        let solProcCodesForCheck: string[] = [];
        if (solicitacaoEnviada) {
          // Buscar guia_solicitacao_id do faturamento
          const { data: fatForSol4 } = await supabase
            .from("faturamentos")
            .select("guia_solicitacao_id")
            .eq("id", faturamentoId)
            .single();
          const guiaSolId4 = (fatForSol4 as any)?.guia_solicitacao_id;
          if (guiaSolId4) {
            const { data: sol } = await supabase
              .from("guia_solicitacao")
              .select("id, nome_beneficiario, profissional_nome, profissional_numero_conselho")
              .eq("id", guiaSolId4)
              .maybeSingle();
            if (sol) {
              const { data: solItens4 } = await supabase
                .from("itens_guia_solicitacao")
                .select("codigo_procedimento, hora_inicial")
                .eq("guia_id", (sol as any).id);
              const horaInicial4 = (solItens4 ?? []).find((it: any) => it.hora_inicial)?.hora_inicial ?? null;
              solDataForCheck = {
                nome_beneficiario: (sol as any).nome_beneficiario,
                hora_inicial: horaInicial4,
                profissional_nome: (sol as any).profissional_nome,
                profissional_numero_conselho: (sol as any).profissional_numero_conselho,
              };
              solProcCodesForCheck = (solItens4 ?? [])
                .map((it: any) => it.codigo_procedimento)
                .filter(Boolean);
            }
          }
        }

        const descResults = checkAposDescricaoCirurgica(
          {
            paciente_nome: (descFatRow as any)?.paciente_nome,
            hora_inicio: (descFatRow as any)?.hora_inicio,
            cirurgiao_principal_nome: (descFatRow as any)?.cirurgiao_principal_nome,
            cirurgiao_principal_crm: (descFatRow as any)?.cirurgiao_principal_crm,
          },
          descProcCodes,
          autorizacaoEnviada ? (autSnapshot as any) : null,
          autProcCodes,
          solDataForCheck,
          solProcCodesForCheck
        );
        const allResults = [...allConsistencyResults, ...descResults];
        setAllConsistencyResults(allResults);
        await saveConsistencyResults(faturamentoId, userId, "apos_descricao_cirurgica", descResults);

        // Definir navegação pendente e exibir tabela
        if (temRevisao && revisaoData && revisaoData.length > 0) {
          setPendingNavigation(() => () => {
            setProcedimentosRevisao(revisaoData);
            setShowProcedureReview(true);
          });
        } else if (initialFaturamentoId) {
          setPendingNavigation(() => () => navigate("/medico/faturamentos"));
        } else {
          setPendingNavigation(() => () => setView("pergunta_honorarios"));
        }
        setShowConsistencyTable(true);
        setFilesDescricao([]);
        showSuccess("Descrição cirúrgica processada com sucesso!");
        return;
      }

      // Mudar view/navegar primeiro (desmonta a lista de arquivos), depois limpar array, toast por último
      if (temRevisao && revisaoData && revisaoData.length > 0) {
        // Show procedure review dialog before proceeding
        setProcedimentosRevisao(revisaoData);
        setShowProcedureReview(true);
        // Don't navigate yet - wait for review to complete
      } else if (initialFaturamentoId) {
        navigate("/medico/faturamentos");
      } else {
        setView("pergunta_honorarios");
      }
      setFilesDescricao([]);
      showSuccess("Descrição cirúrgica processada com sucesso!");
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

  // Callback quando o médico confirma a revisão de procedimentos
  const handleProcedureReviewConfirm = () => {
    setShowProcedureReview(false);
    setProcedimentosRevisao([]);
    if (initialFaturamentoId) {
      navigate("/medico/faturamentos");
    } else {
      setView("pergunta_honorarios");
    }
  };

  // Callback quando o médico pula a revisão de procedimentos
  const handleProcedureReviewClose = () => {
    setShowProcedureReview(false);
    setProcedimentosRevisao([]);
    if (initialFaturamentoId) {
      navigate("/medico/faturamentos");
    } else {
      setView("pergunta_honorarios");
    }
  };

  // Função para gerar a guia de honorários preenchida
  const handleGerarGuiaHonorarios = async () => {
    if (!faturamentoId || !selectedClinicaId) {
      showError("Dados do faturamento não encontrados.");
      return;
    }

    // Reset do PDF (novo preview)
    setPdfGerado(false);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }

    setView("gerando_honorarios");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        showError("Faça login novamente.");
        navigate("/login-medico");
        return;
      }

      const userId = userData.user.id;

      // 1. Buscar modelo de guia para a instituição de faturamento
      const { data: modeloData, error: modeloError } = await supabase
        .from("modelo_guia_faturamento")
        .select("id, html_documento")
        .eq("clinica_id", selectedClinicaId)
        .maybeSingle();

      if (modeloError) {
        console.error("Erro ao buscar modelo:", modeloError);
        setView("sem_modelo");
        return;
      }

      if (!modeloData || !modeloData.html_documento) {
        setView("sem_modelo");
        return;
      }

      // 2. Buscar dados do faturamento
      const { data: fatData, error: fatError } = await supabase
        .from("faturamentos")
        .select(`
          paciente_nome,
          paciente_convenio,
          paciente_carteirinha,
          data_cirurgia,
          hora_inicio,
          hora_fim,
          cirurgiao_principal_nome,
          cirurgiao_principal_crm,
          auxiliar1_nome,
          auxiliar1_crm,
          auxiliar2_nome,
          auxiliar2_crm,
          auxiliar3_nome,
          auxiliar3_crm,
          anestesista_nome,
          anestesista_crm,
          instrumentador_nome,
          instrumentador_crm
        `)
        .eq("id", faturamentoId)
        .single();

      if (fatError || !fatData) {
        showError("Erro ao carregar dados do faturamento.");
        setView("pergunta_honorarios");
        return;
      }

      setFaturamentoData(fatData);

      // 3. Buscar itens do faturamento (procedimentos)
      const { data: itensData, error: itensError } = await supabase
        .from("itens_faturamento")
        .select("codigo_procedimento, descricao_procedimento, quantidade, quantidade_executada")
        .eq("faturamento_id", faturamentoId)
        .order("created_at", { ascending: true });

      if (!itensError && itensData) {
        setItensFaturamento(itensData);
      }

      // 4. Preencher os placeholders no HTML
      let htmlPreenchido = modeloData.html_documento;
      
      // Remover marcadores de código markdown (```html e ```) se existirem
      htmlPreenchido = htmlPreenchido
        .replace(/^```html\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      // Formatar data
      const formatarData = (data: string | null | undefined) => {
        if (!data) return "";
        try {
          // Se a data já está no formato DD/MM/YYYY, retorna direto
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return data;
          // Se está no formato YYYY-MM-DD (ISO), faz split para evitar problema de fuso horário
          const match = data.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            return `${match[3]}/${match[2]}/${match[1]}`;
          }
          // Fallback: tenta parsear com Date usando horário local (meio-dia para evitar shift de fuso)
          const d = new Date(data + "T12:00:00");
          return d.toLocaleDateString("pt-BR");
        } catch {
          return data;
        }
      };

      // Formatar hora
      const formatarHora = (hora: string | null | undefined) => {
        if (!hora) return "";
        // Se já está no formato HH:MM:SS, pega só HH:MM
        if (hora.includes(":")) {
          return hora.substring(0, 5);
        }
        return hora;
      };

      // Substituir placeholders - Profissional (usar cirurgião principal, não médico logado)
      htmlPreenchido = htmlPreenchido.replace(/\{\{profissional_nome\}\}/g, fatData.cirurgiao_principal_nome || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{profissional_crm\}\}/g, fatData.cirurgiao_principal_crm || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{profissional_cod_sist\}\}/g, "");

      // Substituir placeholders - Paciente
      htmlPreenchido = htmlPreenchido.replace(/\{\{paciente_nome\}\}/g, fatData.paciente_nome || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{paciente_registro\}\}/g, fatData.paciente_carteirinha || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{paciente_leito\}\}/g, "");

      // Substituir placeholders - Data/Hora/Convênio
      htmlPreenchido = htmlPreenchido.replace(/\{\{data\}\}/g, formatarData(fatData.data_cirurgia));
      htmlPreenchido = htmlPreenchido.replace(/\{\{hora\}\}/g, formatarHora(fatData.hora_inicio));
      htmlPreenchido = htmlPreenchido.replace(/\{\{convenio\}\}/g, fatData.paciente_convenio || "");

      // Substituir placeholder dinâmico de procedimentos cirúrgicos
      const procedimentos = itensData || [];

      // Suporte ao novo placeholder {{ procedimentos_cirurgicos_rows }}
      const procedimentosRows = procedimentos.length > 0
        ? procedimentos.map((proc: any) => `
            <tr>
              <td>${proc.descricao_procedimento ?? ""}</td>
              <td style="text-align:center">${proc.codigo_procedimento ?? ""}</td>
              <td style="text-align:center">${proc.quantidade_executada ?? proc.quantidade ?? ""}</td>
              <td style="text-align:center"></td>
            </tr>
          `).join("")
        : '<tr><td colspan="4" style="text-align:center;color:#888;padding:4mm">Nenhum procedimento registrado</td></tr>';

      htmlPreenchido = htmlPreenchido.replace(/\{\{\s*procedimentos_cirurgicos_rows\s*\}\}/g, procedimentosRows);

      // Suporte ao padrão legado {{proc_cir_N_*}} (compatibilidade com modelos antigos)
      for (let i = 1; i <= 5; i++) {
        const proc = procedimentos[i - 1];
        htmlPreenchido = htmlPreenchido.replace(new RegExp(`\\{\\{proc_cir_${i}_descricao\\}\\}`, "g"), proc?.descricao_procedimento || "");
        htmlPreenchido = htmlPreenchido.replace(new RegExp(`\\{\\{proc_cir_${i}_cod_sistema\\}\\}`, "g"), proc?.codigo_procedimento || "");
        htmlPreenchido = htmlPreenchido.replace(new RegExp(`\\{\\{proc_cir_${i}_amb_cbhpm\\}\\}`, "g"), "");
        htmlPreenchido = htmlPreenchido.replace(new RegExp(`\\{\\{proc_cir_${i}_via_acesso\\}\\}`, "g"), "");
      }

      // Substituir placeholders - Equipe Cirúrgica
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_cirurgiao_medico\}\}/g, fatData.cirurgiao_principal_nome || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_cirurgiao_crm\}\}/g, fatData.cirurgiao_principal_crm || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_cirurgiao_cod_sist\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_cirurgiao_cpf\}\}/g, "");

      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux1_medico\}\}/g, fatData.auxiliar1_nome || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux1_crm\}\}/g, fatData.auxiliar1_crm || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux1_cod_sist\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux1_cpf\}\}/g, "");

      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux2_medico\}\}/g, fatData.auxiliar2_nome || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux2_crm\}\}/g, fatData.auxiliar2_crm || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux2_cod_sist\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux2_cpf\}\}/g, "");

      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux3_medico\}\}/g, fatData.auxiliar3_nome || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux3_crm\}\}/g, fatData.auxiliar3_crm || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux3_cod_sist\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_aux3_cpf\}\}/g, "");

      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_anestesista_medico\}\}/g, fatData.anestesista_nome || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_anestesista_crm\}\}/g, fatData.anestesista_crm || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_anestesista_cod_sist\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_anestesista_cpf\}\}/g, "");

      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_instrumentador_medico\}\}/g, fatData.instrumentador_nome || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_instrumentador_crm\}\}/g, fatData.instrumentador_crm || "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_instrumentador_cod_sist\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_instrumentador_cpf\}\}/g, "");

      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_perfusionista_medico\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_perfusionista_crm\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_perfusionista_cod_sist\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{equipe_perfusionista_cpf\}\}/g, "");

      // Substituir placeholders - Procedimentos Médicos
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_visita_cod_sistema\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_visita_qtd\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_parecer_cod_sistema\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_parecer_qtd\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_outros_cod_sistema\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_outros_amb_cbhpm\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_outros_qtd\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_extra1_desc\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_extra1_cod_sistema\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_extra1_amb_cbhpm\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_extra1_qtd\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_extra2_desc\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_extra2_cod_sistema\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_extra2_amb_cbhpm\}\}/g, "");
      htmlPreenchido = htmlPreenchido.replace(/\{\{proc_med_extra2_qtd\}\}/g, "");

      // 5. Criar registro na tabela guia_honorarios
      const guiaData: Record<string, unknown> = {
        medico_id: userId,
        clinica_id: selectedClinicaId,
        modelo_id: modeloData.id,
        html_preenchido: htmlPreenchido,
        // Profissional = Cirurgião Principal
        profissional_nome: fatData.cirurgiao_principal_nome || null,
        profissional_crm: fatData.cirurgiao_principal_crm || null,
        paciente_nome: fatData.paciente_nome || null,
        paciente_registro: fatData.paciente_carteirinha || null,
        data: formatarData(fatData.data_cirurgia) || null,
        hora: formatarHora(fatData.hora_inicio) || null,
        convenio: fatData.paciente_convenio || null,
        equipe_cirurgiao_medico: fatData.cirurgiao_principal_nome || null,
        equipe_cirurgiao_crm: fatData.cirurgiao_principal_crm || null,
        equipe_aux1_medico: fatData.auxiliar1_nome || null,
        equipe_aux1_crm: fatData.auxiliar1_crm || null,
        equipe_aux2_medico: fatData.auxiliar2_nome || null,
        equipe_aux2_crm: fatData.auxiliar2_crm || null,
        equipe_aux3_medico: fatData.auxiliar3_nome || null,
        equipe_aux3_crm: fatData.auxiliar3_crm || null,
        equipe_anestesista_medico: fatData.anestesista_nome || null,
        equipe_anestesista_crm: fatData.anestesista_crm || null,
        equipe_instrumentador_medico: fatData.instrumentador_nome || null,
        equipe_instrumentador_crm: fatData.instrumentador_crm || null,
      };

      // Adicionar procedimentos
      for (let i = 1; i <= 5; i++) {
        const proc = procedimentos[i - 1];
        guiaData[`proc_cir_${i}_descricao`] = proc?.descricao_procedimento || null;
        guiaData[`proc_cir_${i}_cod_sistema`] = proc?.codigo_procedimento || null;
      }

      const { data: guiaCreated, error: guiaError } = await supabase
        .from("guia_honorarios")
        .insert(guiaData)
        .select("id")
        .single();

      if (guiaError || !guiaCreated) {
        console.error("Erro ao criar guia de honorários:", guiaError);
        showError("Erro ao salvar a guia de honorários.");
        setView("pergunta_honorarios");
        return;
      }

      setGuiaHonorariosId(guiaCreated.id);
      setHtmlGuiaPreenchida(htmlPreenchido);

      // 6. Vincular a guia ao faturamento
      await supabase
        .from("faturamentos")
        .update({ guia_honorarios_id: guiaCreated.id })
        .eq("id", faturamentoId);

      if (initialFaturamentoId) {
        // Fluxo de retomada: após gerar, volta para a lista
        navigate("/medico/faturamentos");
      } else {
        setView("preview_honorarios");
      }
    } catch (err) {
      console.error("Erro ao gerar guia de honorários:", err);
      showError("Erro ao gerar a guia de honorários.");
      setView("pergunta_honorarios");
    }
  };

  // Função para pular a guia de honorários e finalizar
  const handlePularGuiaHonorarios = async () => {
    if (initialFaturamentoId) {
      navigate("/medico/faturamentos");
    } else {
      await finalizarFaturamento();
    }
  };

  // Função para gerar PDF da guia de honorários
  const gerarPdfGuiaHonorarios = async (html: string): Promise<Blob | null> => {
    console.log("[PDF] Iniciando geração do PDF da guia de honorários");
    console.log("[PDF] htmlGuiaPreenchida length:", html?.length || 0);

    if (!html) {
      console.error("[PDF] HTML da guia não disponível");
      return null;
    }

    // Criar container temporário com estilos corrigidos para PDF
    const tempContainer = document.createElement("div");
    tempContainer.id = "pdf-capture-container";
    
    // Injetar CSS para corrigir line-height e renderização de fontes
    const styleTag = document.createElement("style");
    styleTag.id = "pdf-capture-styles";
    styleTag.textContent = `
      #pdf-capture-container, #pdf-capture-container * {
        line-height: 1.6 !important;
        font-family: Arial, Helvetica, sans-serif !important;
      }
      #pdf-capture-container td, #pdf-capture-container th {
        padding: 6px 8px !important;
        vertical-align: middle !important;
      }
      #pdf-capture-container table { border-collapse: collapse !important; }
    `;
    
    tempContainer.innerHTML = html;
    tempContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      background-color: #ffffff;
      padding: 20px;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
    `;
    
    document.head.appendChild(styleTag);
    document.body.appendChild(tempContainer);

    try {
      console.log("[PDF] Aguardando renderização...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Forçar reflow
      tempContainer.offsetHeight;
      
      console.log("[PDF] Capturando com html2canvas...");
      
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById("pdf-capture-container");
          if (el) {
            el.querySelectorAll("*").forEach((node) => {
              (node as HTMLElement).style.lineHeight = "1.6";
            });
          }
        },
      });

      console.log("[PDF] Canvas gerado:", canvas.width, "x", canvas.height);

      // Criar PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true, // Ativar compressão
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular dimensões mantendo proporção
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10; // Margem superior

      // Se a imagem for maior que uma página, dividir em múltiplas páginas
      const scaledHeight = imgHeight * ratio;
      const pageHeight = pdfHeight - 20; // Margem

      console.log("[PDF] Dimensões - pdfWidth:", pdfWidth, "pdfHeight:", pdfHeight, "scaledHeight:", scaledHeight);

      if (scaledHeight <= pageHeight) {
        // Cabe em uma página - usar JPEG com qualidade 0.8 para menor tamanho
        const imgData = canvas.toDataURL("image/jpeg", 0.8);
        console.log("[PDF] Imagem gerada (JPEG), tamanho:", imgData.length);
        pdf.addImage(imgData, "JPEG", imgX, imgY, imgWidth * ratio, scaledHeight);
        console.log("[PDF] PDF gerado com 1 página");
      } else {
        // Múltiplas páginas
        let remainingHeight = scaledHeight;
        let currentY = 0;
        let pageNum = 0;

        while (remainingHeight > 0) {
          if (pageNum > 0) {
            pdf.addPage();
          }

          const heightToDraw = Math.min(pageHeight, remainingHeight);
          
          // Criar um canvas temporário para a porção atual
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = canvas.width;
          tempCanvas.height = (heightToDraw / ratio) * (canvas.width / imgWidth);
          
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.drawImage(
              canvas,
              0,
              currentY / ratio,
              canvas.width,
              tempCanvas.height,
              0,
              0,
              tempCanvas.width,
              tempCanvas.height
            );
            
            // Usar JPEG com qualidade 0.8 para menor tamanho
            const tempImgData = tempCanvas.toDataURL("image/jpeg", 0.8);
            pdf.addImage(tempImgData, "JPEG", imgX, imgY, imgWidth * ratio, heightToDraw);
          }

          remainingHeight -= heightToDraw;
          currentY += heightToDraw;
          pageNum++;
        }
        console.log("[PDF] PDF gerado com", pageNum, "páginas");
      }

      // Limpar elementos temporários
      document.body.removeChild(tempContainer);
      const styleEl = document.getElementById("pdf-capture-styles");
      if (styleEl) document.head.removeChild(styleEl);

      // Retornar como Blob
      const blob = pdf.output("blob");
      console.log("[PDF] Blob gerado, tamanho:", blob.size, "bytes", "(" + (blob.size / 1024 / 1024).toFixed(2) + " MB)");
      return blob;
    } catch (error) {
      console.error("[PDF] Erro ao gerar PDF:", error);
      // Limpar elementos temporários em caso de erro
      const container = document.getElementById("pdf-capture-container");
      if (container) document.body.removeChild(container);
      const styleEl = document.getElementById("pdf-capture-styles");
      if (styleEl) document.head.removeChild(styleEl);
      return null;
    }
  };

  // Função para gerar e salvar o PDF
  const handleGerarPdf = async (opts?: {
    guiaHonorariosIdOverride?: string;
    htmlOverride?: string;
  }) => {
    const guiaId = opts?.guiaHonorariosIdOverride ?? guiaHonorariosId;
    const html = opts?.htmlOverride ?? htmlGuiaPreenchida;

    console.log("[handleGerarPdf] Iniciando...");
    console.log("[handleGerarPdf] guiaHonorariosId:", guiaId);
    console.log("[handleGerarPdf] html length:", html?.length || 0);

    if (!guiaId || !html) {
      console.log("[handleGerarPdf] Sem guia ou HTML, não pode gerar PDF");
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.error("[handleGerarPdf] Erro de autenticação:", userError);
        showError("Faça login novamente.");
        navigate("/login-medico");
        return;
      }

      const userId = userData.user.id;
      console.log("[handleGerarPdf] userId:", userId);

      // 1. Gerar o PDF
      console.log("[handleGerarPdf] Gerando PDF...");
      const pdfBlob = await gerarPdfGuiaHonorarios(html);
      
      if (!pdfBlob) {
        console.error("[handleGerarPdf] Falha ao gerar PDF - blob é null");
        showError("Não foi possível gerar o PDF da guia.");
        return;
      }

      console.log("[handleGerarPdf] PDF gerado com sucesso, tamanho:", pdfBlob.size);

      // Criar URL para download
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl(blobUrl);

      // 2. Fazer upload do PDF para o storage
      const bucketName = "NPS-pro";
      const timestamp = Date.now();
      const pdfFileName = `guia_honorarios_${guiaId}_${timestamp}.pdf`;
      const pdfPath = `guia_honorarios/${userId}/${pdfFileName}`;

      console.log("[handleGerarPdf] Fazendo upload para:", pdfPath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(pdfPath, pdfBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/pdf",
        });

      if (uploadError) {
        console.error("[handleGerarPdf] Erro no upload:", uploadError);
        showError(`Erro ao salvar PDF no servidor: ${uploadError.message}`);
        // Mesmo com erro no upload, permite download local
        setPdfGerado(true);
        return;
      }

      console.log("[handleGerarPdf] Upload concluído:", uploadData);

      // 3. Atualizar a tabela guia_honorarios com o path do PDF
      console.log("[handleGerarPdf] Atualizando tabela guia_honorarios...");
      const { data: updateData, error: updateError } = await supabase
        .from("guia_honorarios")
        .update({
          pdf_guia_honorario: pdfPath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", guiaId)
        .select();

      if (updateError) {
        console.error("[handleGerarPdf] Erro ao atualizar tabela:", updateError);
        showError(`Erro ao registrar PDF: ${updateError.message}`);
      } else {
        console.log("[handleGerarPdf] Tabela atualizada com sucesso:", updateData);
        showSuccess("PDF da guia gerado e salvo com sucesso!");
      }

      setPdfGerado(true);
    } catch (error) {
      console.error("[handleGerarPdf] Erro geral:", error);
      showError("Erro ao processar PDF da guia.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Função para baixar o PDF
  const handleBaixarPdf = () => {
    if (!pdfBlobUrl) {
      showError("PDF não disponível para download.");
      return;
    }

    const link = document.createElement("a");
    link.href = pdfBlobUrl;
    link.download = `guia_honorarios_${guiaHonorariosId || "documento"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para avançar após preview da guia (agora mostra diálogo de emails)
  const handleAvancarAposPreview = async () => {
    console.log("[handleAvancarAposPreview] Mostrando diálogo de envio de emails...");
    setShowEmailDialog(true);
  };

  // Callback quando emails são enviados com sucesso
  const handleEmailsSent = async () => {
    console.log("[handleEmailsSent] Emails enviados, finalizando faturamento...");
    setShowEmailDialog(false);
    if (initialFaturamentoId) {
      // Veio do fluxo de retomada — voltar para a lista de faturamentos
      navigate("/medico/faturamentos");
    } else {
      await finalizarFaturamento();
    }
  };

  // Callback quando usuário pula o envio de emails
  const handleSkipEmails = async () => {
    console.log("[handleSkipEmails] Usuário pulou envio de emails, finalizando faturamento...");
    setShowEmailDialog(false);
    if (initialFaturamentoId) {
      navigate("/medico/faturamentos");
    } else {
      await finalizarFaturamento();
    }
  };

  // Função para finalizar o faturamento (mudar status para ATIVO)
  const finalizarFaturamento = async () => {
    if (!faturamentoId) {
      setView("success");
      return;
    }

    try {
      const { error } = await supabase
        .from("faturamentos")
        .update({
          status: "ATIVO",
          updated_at: new Date().toISOString(),
        })
        .eq("id", faturamentoId);

      if (error) {
        console.error("Erro ao finalizar faturamento:", error);
      }

      showSuccess("Faturamento concluído com sucesso!");
      setView("success");
    } catch (err) {
      console.error("Erro ao finalizar:", err);
      setView("success");
    }
  };

  const saudacao = medicoNome ? `Olá, Dr. ${medicoNome}.` : "Olá, médico.";
  const totalSteps = 6;
  const currentStep =
    view === "start"
      ? 1
      : view === "hospital"
        ? 1
        : view === "pergunta_solicitacao"
          ? 2
          : view === "upload_solicitacao"
            ? 3
            : view === "pergunta_guia_autorizacao"
              ? 3
              : view === "upload_guia"
                ? 3
                : view === "upload_descricao"
                  ? 4
                  : view === "pergunta_honorarios" || view === "gerando_honorarios" || view === "preview_honorarios" || view === "sem_modelo"
                    ? 5
                    : 6;

  const handleNovaDescricao = () => {
    setFilesGuia([]);
    setFilesSolicitacao([]);
    setFilesDescricao([]);
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
    setFaturamentoData(null);
    setItensFaturamento([]);
    setHtmlGuiaPreenchida("");
    setGuiaHonorariosId(null);
    setTipoCirurgia(null);
    // Resetar revisão de procedimentos
    setShowProcedureReview(false);
    setProcedimentosRevisao([]);
    // Resetar zoom do preview para 50%
    setGuiaZoom(0.5);
    // Resetar estados do PDF
    setPdfGerado(false);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
    }
    setPdfBlobUrl(null);
    // Resetar estados de consistência
    setConsistencyCheckEnabled(false);
    setAllConsistencyResults([]);
    setShowConsistencyTable(false);
    setPendingNavigation(null);
    setSolicitacaoEnviada(false);
    setAutorizacaoEnviada(false);
  };

  const currentFiles =
    view === "upload_guia"
      ? filesGuia
      : view === "upload_solicitacao"
        ? filesSolicitacao
        : filesDescricao;

  const totalArquivos = currentFiles.length;
  const arquivosLabel =
    totalArquivos === 0
      ? "Nenhum arquivo"
      : totalArquivos === 1
        ? "1 arquivo"
        : `${totalArquivos} arquivos`;

  const isImage = (file: File) => file.type.startsWith("image/");

  const handleAdicionarMaisGuia = () => {
    fileInputRefGuia.current?.click();
  };

  const handleAdicionarMaisSolicitacao = () => {
    fileInputRefSolicitacao.current?.click();
  };

  const handleAdicionarMaisDescricao = () => {
    fileInputRefDescricao.current?.click();
  };

  const handleRemoverArquivoGuia = (index: number) => {
    setFilesGuia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoverArquivoSolicitacao = (index: number) => {
    setFilesSolicitacao((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoverArquivoDescricao = (index: number) => {
    setFilesDescricao((prev) => prev.filter((_, i) => i !== index));
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
      setView("pergunta_solicitacao");
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

  const getAnalyzingDocTitle = () => {
    switch (analyzingDocType) {
      case "solicitacao":
        return "Guia de Solicitação";
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

  const getAnalyzingStepDescription = () => {
    if (analyzingStep === "uploading") {
      switch (analyzingDocType) {
        case "solicitacao":
          return "Fazendo upload das imagens da guia de solicitação.";
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
        case "solicitacao":
          return "O sistema está extraindo as informações da guia de solicitação.";
        case "guia":
          return "O sistema está extraindo as informações da guia.";
        case "descricao":
          return "O sistema está extraindo as informações da descrição cirúrgica.";
        case "honorarios":
          return "O sistema está extraindo as informações da guia de faturamento de honorários.";
        default:
          return "";
      }
    }
    return "Gravando os dados extraídos no sistema.";
  };

  const getStepLabel = () => {
    switch (view) {
      case "hospital":
        return "Selecionar Instituições";
      case "pergunta_solicitacao":
      case "upload_solicitacao":
        return "Guia de Solicitação";
      case "pergunta_guia_autorizacao":
        return "Guia de Autorização de Cirurgia";
      case "upload_guia":
        return "Guia de Autorização de Cirurgia";
      case "upload_descricao":
        return "Descrição Cirúrgica";
      case "pergunta_honorarios":
      case "gerando_honorarios":
      case "preview_honorarios":
      case "sem_modelo":
        return "Guia de Honorários";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#F5F5F5] relative overflow-hidden">
      {/* Fundo premium */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,23,0.10)_0,#0b0b0b_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/55 to-[#121212]/80" />

      <div className="relative z-10 flex min-h-screen w-full flex-col px-4 py-5 sm:px-6 lg:px-8">
        {(view !== "start" && view !== "success") && (
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
                    : view === "pergunta_solicitacao"
                      ? () => {
                          setView("hospital");
                          setStep(1);
                        }
                      : view === "upload_solicitacao"
                        ? () => {
                            setView("pergunta_solicitacao");
                          }
                        : view === "pergunta_guia_autorizacao"
                          ? () => {
                              setView("pergunta_solicitacao");
                            }
                          : view === "upload_guia"
                            ? () => {
                                setView("pergunta_guia_autorizacao");
                              }
                            : view === "upload_descricao"
                              ? () => {
                                  setView("upload_guia");
                                }
                              : view === "pergunta_honorarios"
                                ? () => {
                                    setView("upload_descricao");
                                  }
                                : view === "sem_modelo"
                                  ? () => {
                                      setView("pergunta_honorarios");
                                    }
                                  : view === "preview_honorarios"
                                    ? () => {
                                        setView("pergunta_honorarios");
                                      }
                                    : () => navigate("/medico/dashboard")
                }
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar</span>
              </button>

              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 rounded-full bg-[#D4A017]/10 px-3 py-1.5 text-[11px] text-[#D4A017] border border-[#D4A017]/20">
                  <span className="h-2 w-2 rounded-full bg-[#D4A017] shadow-[0_0_8px_rgba(212,160,23,0.8)]" />
                  <span>Passo {currentStep}/{totalSteps}</span>
                </div>
                <span className="text-[11px] text-[#D4A017] pr-1">
                  {getStepLabel()}
                </span>
              </div>
            </header>
          </>
        )}

        {/* Barra de progresso do fluxo sempre no topo */}
        {view !== "start" && (
          <div className="mb-5 w-full max-w-md self-center">
            <div className="h-1 w-full rounded-full bg-black/40 border border-[#D4A017]/10">
              <div
                className="h-1 rounded-full bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}

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

                {/* Contador de faturamentos do mês */}
                {!billingQuota.loading && billingQuota.limit !== null && (
                  <div className={`mt-5 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 w-full max-w-sm ${
                    billingQuota.isOverLimit
                      ? "border-rose-500/40 bg-[#2a0a0a]"
                      : billingQuota.isNearLimit
                        ? "border-amber-500/40 bg-amber-950/20"
                        : "border-[#D4A017]/20 bg-black/40"
                  }`}>
                    <div className="flex items-center gap-2">
                      <Scissors className={`h-4 w-4 flex-shrink-0 ${billingQuota.isOverLimit ? "text-rose-400" : billingQuota.isNearLimit ? "text-amber-400" : "text-[#D4A017]"}`} />
                      <div>
                        <p className="text-xs font-semibold text-[#F5F5F5]">Faturamentos do mês</p>
                        <p className="text-[11px] text-[#9CA3AF]">
                          {billingQuota.used} de {billingQuota.limit} do seu plano
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${billingQuota.isOverLimit ? "text-rose-400" : billingQuota.isNearLimit ? "text-amber-400" : "text-[#D4A017]"}`}>
                      {billingQuota.used}/{billingQuota.limit}
                    </span>
                  </div>
                )}

                {/* Checkbox de consistência — oculto quando limite excedido */}
                {(!billingQuota.isOverLimit) && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#D4A017]/20 bg-black/40 px-4 py-3 w-full max-w-sm">
                    <Checkbox
                      id="consistency-check"
                      checked={consistencyCheckEnabled}
                      onCheckedChange={(v) => setConsistencyCheckEnabled(!!v)}
                      className="border-[#D4A017]/50 data-[state=checked]:bg-[#D4A017] data-[state=checked]:border-[#D4A017]"
                    />
                    <label htmlFor="consistency-check" className="text-sm text-[#F5F5F5] cursor-pointer leading-snug">
                      Verificar consistência entre documentos
                      <span className="block text-xs text-[#9CA3AF] mt-0.5">
                        O sistema compara os dados de cada documento ao longo do processo
                      </span>
                    </label>
                  </div>
                )}

                {/* Limite excedido: bloquear e mostrar upgrade */}
                {!billingQuota.loading && billingQuota.isOverLimit ? (
                  <div className="mt-5 flex w-full max-w-sm flex-col items-center gap-4">
                    {/* Card de alerta */}
                    <div className="w-full rounded-2xl border border-rose-500/25 bg-[#2a0a0a] px-5 py-6 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/15">
                        <AlertCircle className="h-7 w-7 text-rose-400" />
                      </div>
                      <p className="text-sm font-semibold text-rose-300">
                        Limite de faturamentos atingido
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-rose-400/80">
                        Você utilizou {billingQuota.used} de {billingQuota.limit} faturamentos do seu plano neste mês.
                      </p>
                    </div>

                    {/* Botão upgrade */}
                    <a
                      href="https://site.conmedic.com.br"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] px-4 py-3.5 text-sm font-semibold text-black shadow-[0_0_25px_rgba(212,160,23,0.45)] hover:shadow-[0_0_40px_rgba(212,160,23,0.65)] hover:scale-[1.01] transition-all duration-300"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Fazer Upgrade do Plano
                    </a>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleIniciarFluxo}
                    disabled={billingQuota.loading}
                    className="mt-10 flex h-52 w-52 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] via-[#D4A017] to-[#B8860B] text-center text-black shadow-[0_0_60px_rgba(212,160,23,0.35)] ring-8 ring-[#D4A017]/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_90px_rgba(212,160,23,0.45)] sm:h-56 sm:w-56 disabled:opacity-60 disabled:cursor-not-allowed"
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
                )}

                <p className="mt-8 text-[11px] text-[#6B7280]">
                  Seus dados são criptografados ponta a ponta.
                </p>
              </div>
            </div>
          )}

          {/* TELA 2 - HOSPITAL + CLÍNICA */}
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
                      onClick={() => setHospitalStepView("selector")}
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

          {/* TELA 2.5 - PERGUNTA GUIA DE SOLICITAÇÃO */}
          {view === "pergunta_solicitacao" && (
            <div className="mt-2 flex w-full max-w-md flex-col items-center">
              <div className="w-full rounded-2xl bg-black/70 backdrop-blur-xl px-6 py-8 shadow-[0_0_40px_rgba(212,160,23,0.12)] border border-[#D4A017]/20 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_30px_rgba(212,160,23,0.35)]">
                  <FileCheck className="h-8 w-8" />
                </div>

                <h2 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl mb-2">
                  Guia de Solicitação
                </h2>
                <p className="text-xs text-[#9CA3AF] sm:text-sm mb-8">
                  Deseja enviar a Guia de Solicitação agora? Esta etapa é opcional.
                </p>

                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
                    onClick={() => {
                      setView("upload_solicitacao");
                      setTimeout(() => fileInputRefSolicitacao.current?.click(), 100);
                    }}
                  >
                    Sim, enviar guia
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                    onClick={() => setView("pergunta_guia_autorizacao")}
                  >
                    Não, pular esta etapa
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TELA 2.55 - PERGUNTA GUIA DE AUTORIZAÇÃO + TIPO DE CIRURGIA */}
          {view === "pergunta_guia_autorizacao" && (
            <div className="mt-2 flex w-full max-w-md flex-col items-center">
              <div className="w-full rounded-2xl bg-black/70 backdrop-blur-xl px-6 py-8 shadow-[0_0_40px_rgba(212,160,23,0.12)] border border-[#D4A017]/20 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] text-black shadow-[0_0_30px_rgba(212,160,23,0.35)]">
                  <Calendar className="h-8 w-8" />
                </div>

                <h2 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl mb-2">
                  Guia de Autorização de Cirurgia
                </h2>
                <p className="text-xs text-[#9CA3AF] sm:text-sm mb-6">
                  Antes de continuar, selecione o tipo de cirurgia e informe se deseja enviar a guia de autorização.
                </p>

                <div className="mb-6">
                  <p className="mb-3 text-xs font-semibold text-[#F5F5F5]">
                    Qual o tipo de cirurgia?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTipoCirurgia("ELETIVA")}
                      className={`group rounded-2xl border px-4 py-4 text-left transition-colors ${
                        tipoCirurgia === "ELETIVA"
                          ? "border-[#FFD700]/60 bg-[#FFD700]/10"
                          : "border-[#D4A017]/15 bg-black/40 hover:border-[#D4A017]/35"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                            tipoCirurgia === "ELETIVA"
                              ? "border-[#FFD700]/40 bg-[#FFD700]/20 text-[#FFD700]"
                              : "border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]"
                          }`}
                        >
                          <Calendar className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#F5F5F5]">
                            Eletiva
                          </p>
                          <p className="text-[11px] text-[#9CA3AF]">Agendada</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTipoCirurgia("EMERGENCIAL")}
                      className={`group rounded-2xl border px-4 py-4 text-left transition-colors ${
                        tipoCirurgia === "EMERGENCIAL"
                          ? "border-[#FFD700]/60 bg-[#FFD700]/10"
                          : "border-[#D4A017]/15 bg-black/40 hover:border-[#D4A017]/35"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                            tipoCirurgia === "EMERGENCIAL"
                              ? "border-[#FFD700]/40 bg-[#FFD700]/20 text-[#FFD700]"
                              : "border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]"
                          }`}
                        >
                          <Zap className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#F5F5F5]">
                            Emergencial
                          </p>
                          <p className="text-[11px] text-[#9CA3AF]">Urgência</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {!tipoCirurgia && (
                    <p className="mt-3 text-[11px] text-[#D4A017]">
                      Selecione o tipo de cirurgia para continuar.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
                    disabled={!tipoCirurgia || isUploading}
                    onClick={handleContinuarParaUploadGuiaAutorizacao}
                  >
                    Sim, enviar guia
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                    disabled={!tipoCirurgia || isUploading}
                    onClick={handlePularGuiaAutorizacao}
                  >
                    Não, continuar sem guia
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TELA 2.6 - UPLOAD GUIA DE SOLICITAÇÃO */}
          {view === "upload_solicitacao" && (
            <div className="mt-2 flex w-full max-w-md flex-col">
              <Input
                id="files-upload-solicitacao"
                ref={fileInputRefSolicitacao}
                type="file"
                multiple
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleFileChangeSolicitacao}
              />

              <div className="mb-6">
                <h1 className="text-lg font-semibold text-[#F5F5F5] sm:text-xl">
                  {medicoNome ? `Dr. ${medicoNome},` : "Doutor(a),"}
                </h1>
                <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
                  {filesSolicitacao.length === 0 ? (
                    <>
                      <span>
                        Faça upload das imagens/PDF da{" "}
                        <span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">
                          Guia de Solicitação
                        </span>
                        .
                      </span>
                      <br />
                      <span className="text-[11px] text-[#6B7280] sm:text-xs">
                        Obs: Tire várias imagens com os detalhes dos campos para melhor
                        análise da IA
                      </span>
                    </>
                  ) : (
                    <>
                      Confira os arquivos antes de enviar a{" "}
                      <span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">
                        Guia de Solicitação
                      </span>
                    </>
                  )}
                </p>
              </div>

              {filesSolicitacao.length === 0 ? (
                <>
                  <label
                    htmlFor="files-upload-solicitacao"
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
                      onClick={handleAdicionarMaisSolicitacao}
                    >
                      + Adicionar mais
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {filesSolicitacao.map((file, index) => (
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
                          onClick={() => handleRemoverArquivoSolicitacao(index)}
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
                    disabled={isUploading || filesSolicitacao.length === 0}
                    onClick={handleUploadGuiaSolicitacao}
                  >
                    {isUploading ? "Processando..." : "Processar Guia"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
                    onClick={() => setView("pergunta_solicitacao")}
                    disabled={isUploading}
                  >
                    Voltar
                  </Button>
                </>
              )}
            </div>
          )}

          {/* TELA 3 - UPLOAD GUIA DE AUTORIZAÇÃO */}
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
                        Faça upload das imagens da{" "}
                        <span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">
                          Guia de Autorização de Cirurgia
                        </span>
                        .
                      </span>
                      <br />
                      <span className="text-[11px] text-[#6B7280] sm:text-xs">
                        Obs: Tire várias imagens com os detalhes dos campos da mesma
                        guia para melhor análise da IA
                      </span>
                    </>
                  ) : (
                    <>
                      Confira os arquivos antes de enviar a{" "}
                      <span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">
                        Guia de Autorização de Cirurgia
                      </span>
                    </>
                  )}
                </p>
              </div>

              {filesGuia.length === 0 ? (
                <>
                  <label
                    htmlFor="files-upload-guia"
                    className="cursor-pointer rounded-2xl border-2 border-dashed border-[#D4A017]/30 bg-[#1a1a1a] p-8 text-center transition-all hover:border-[#D4A017]/60 hover:bg-[#D4A017]/5"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] shadow-[0_0_30px_rgba(212,160,23,0.4)] transition-shadow hover:shadow-[0_0_40px_rgba(212,160,23,0.6)]">
                        <Upload className="h-8 w-8 text-black" />
                      </div>
                      <p className="font-medium text-[#F5F5F5]">Adicionar Arquivos</p>
                      <p className="text-sm text-[#9CA3AF]">Câmera ou Galeria</p>
                      <p className="text-[11px] text-[#6B7280]">
                        Formatos aceitos: PNG, JPEG, GIF, WEBP e PDF.
                      </p>
                    </div>
                  </label>

                  <Button
                    type="button"
                    disabled
                    className="mt-8 h-11 w-full rounded-lg border border-[#D4A017]/10 bg-black/50 text-xs font-semibold text-[#6B7280]"
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
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[#D4A017]/15 bg-black/60 px-4 py-3 text-xs text-[#F5F5F5] transition-colors hover:border-[#D4A017]/30"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]">
                            {isImage(file) ? (
                              <ImageIcon className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] sm:text-xs">{file.name}</p>
                            <p className="mt-0.5 text-[10px] text-[#6B7280]">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverArquivoGuia(index)}
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[#D4A017]/15 bg-black/50 text-[#9CA3AF] hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    className="mt-8 h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] disabled:opacity-70"
                    disabled={isUploading || filesGuia.length === 0}
                    onClick={handleUploadGuiaAutorizacao}
                  >
                    {isUploading ? "Processando..." : "Processar Guia"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
                    onClick={() => setView("pergunta_guia_autorizacao")}
                    disabled={isUploading}
                  >
                    Voltar
                  </Button>
                </>
              )}
            </div>
          )}

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
                        Faça upload da{" "}
                        <span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">
                          Descrição Cirúrgica
                        </span>
                        .
                      </span>
                      <br />
                      <span className="text-[11px] text-[#6B7280] sm:text-xs">
                        Envie imagens nítidas ou PDF para extrair os procedimentos com precisão.
                      </span>
                    </>
                  ) : (
                    <>
                      Confira os arquivos antes de enviar a{" "}
                      <span className="rounded-md bg-[#FFD700]/20 px-1.5 py-0.5 font-semibold text-[#FFD700] ring-1 ring-[#D4A017]/30">
                        Descrição Cirúrgica
                      </span>
                    </>
                  )}
                </p>
              </div>

              {filesDescricao.length === 0 ? (
                <>
                  <label
                    htmlFor="files-upload-descricao"
                    className="cursor-pointer rounded-2xl border-2 border-dashed border-[#D4A017]/30 bg-[#1a1a1a] p-8 text-center transition-all hover:border-[#D4A017]/60 hover:bg-[#D4A017]/5"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] shadow-[0_0_30px_rgba(212,160,23,0.4)]">
                        <Scissors className="h-8 w-8 text-black" />
                      </div>
                      <p className="font-medium text-[#F5F5F5]">Adicionar Arquivos</p>
                      <p className="text-sm text-[#9CA3AF]">Câmera ou Galeria</p>
                      <p className="text-[11px] text-[#6B7280]">
                        Formatos aceitos: PNG, JPEG, GIF, WEBP e PDF.
                      </p>
                    </div>
                  </label>

                  <Button
                    type="button"
                    disabled
                    className="mt-8 h-11 w-full rounded-lg border border-[#D4A017]/10 bg-black/50 text-xs font-semibold text-[#6B7280]"
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
                      onClick={handleAdicionarMaisDescricao}
                    >
                      + Adicionar mais
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {filesDescricao.map((file, index) => (
                      <div
                        key={file.name + file.lastModified + index}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[#D4A017]/15 bg-black/60 px-4 py-3 text-xs text-[#F5F5F5] transition-colors hover:border-[#D4A017]/30"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#D4A017]/20 bg-[#D4A017]/10 text-[#D4A017]">
                            {isImage(file) ? (
                              <ImageIcon className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] sm:text-xs">{file.name}</p>
                            <p className="mt-0.5 text-[10px] text-[#6B7280]">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoverArquivoDescricao(index)}
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[#D4A017]/15 bg-black/50 text-[#9CA3AF] hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    className="mt-8 h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] disabled:opacity-70"
                    disabled={isUploading || filesDescricao.length === 0}
                    onClick={handleUploadDescricaoCirurgica}
                  >
                    {isUploading ? "Processando..." : "Processar Descrição"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
                    onClick={() =>
                      setView(
                        autorizacaoEnviada ? "upload_guia" : "pergunta_guia_autorizacao",
                      )
                    }
                    disabled={isUploading}
                  >
                    Voltar
                  </Button>
                </>
              )}
            </div>
          )}

          {view === "pergunta_honorarios" && (
            <div className="mt-2 flex w-full max-w-md flex-col">
              <div className="rounded-3xl border border-[#D4A017]/20 bg-black/40 p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4A017]/15 text-[#FFD700]">
                    <FileCheck className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-[#F5F5F5]">
                      Gerar guia de honorários?
                    </h2>
                    <p className="text-xs text-[#9CA3AF]">
                      Podemos preencher automaticamente o modelo da instituição de faturamento.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-shadow hover:shadow-[0_0_30px_rgba(212,160,23,0.6)]"
                    onClick={handleGerarGuiaHonorarios}
                  >
                    Gerar guia automaticamente
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                    onClick={() => void handlePularGuiaHonorarios()}
                  >
                    Pular esta etapa
                  </Button>
                </div>
              </div>
            </div>
          )}

          {view === "gerando_honorarios" && (
            <div className="mt-2 flex w-full max-w-md flex-col items-center">
              <div className="w-full rounded-3xl border border-[#D4A017]/20 bg-black/40 p-8 text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#FFD700]" />
                <h2 className="mt-4 text-lg font-semibold text-[#F5F5F5]">
                  Gerando guia de honorários
                </h2>
                <p className="mt-2 text-sm text-[#9CA3AF]">
                  Estamos preenchendo o modelo da instituição com os dados extraídos do faturamento.
                </p>
              </div>
            </div>
          )}

          {view === "sem_modelo" && (
            <div className="mt-2 flex w-full max-w-md flex-col items-center">
              <div className="w-full rounded-3xl border border-[#D4A017]/20 bg-black/40 p-8 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-[#D4A017]" />
                <h2 className="mt-4 text-lg font-semibold text-[#F5F5F5]">
                  Modelo de guia não encontrado
                </h2>
                <p className="mt-2 text-sm text-[#9CA3AF]">
                  Não existe um modelo configurado para a instituição selecionada.
                </p>

                <div className="mt-6 space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                    onClick={() => setView("pergunta_honorarios")}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black"
                    onClick={() => void handlePularGuiaHonorarios()}
                  >
                    Continuar sem guia
                  </Button>
                </div>
              </div>
            </div>
          )}

          {view === "preview_honorarios" && (
            <div className="flex w-full max-w-5xl flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-3xl border border-[#D4A017]/20 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#F5F5F5]">
                    Preview da guia de honorários
                  </h2>
                  <p className="text-xs text-[#9CA3AF]">
                    Revise o documento antes de concluir o faturamento.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                    onClick={() => setGuiaZoom((prev) => Math.max(ZOOM_MIN, Number((prev - ZOOM_STEP).toFixed(2))))}
                  >
                    - Zoom
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                    onClick={() => setGuiaZoom((prev) => Math.min(ZOOM_MAX, Number((prev + ZOOM_STEP).toFixed(2))))}
                  >
                    + Zoom
                  </Button>
                  <span className="rounded-full border border-[#D4A017]/20 px-3 py-1 text-xs text-[#D4A017]">
                    {Math.round(guiaZoom * 100)}%
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-[#D4A017]/20 bg-black/40 p-4">
                <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[#9CA3AF]">
                  <span className="flex items-center gap-2 rounded-full border border-[#D4A017]/20 px-3 py-1">
                    <Building2 className="h-3.5 w-3.5 text-[#D4A017]" />
                    Cirurgia: {selectedHospitalName || "Não informado"}
                  </span>
                  <span className="flex items-center gap-2 rounded-full border border-[#D4A017]/20 px-3 py-1">
                    <CircleDollarSign className="h-3.5 w-3.5 text-[#D4A017]" />
                    Faturamento: {selectedClinicaName || "Não informado"}
                  </span>
                </div>

                <div className="overflow-auto rounded-2xl bg-white p-4">
                  <div
                    ref={guiaPreviewRef}
                    className="origin-top transition-transform"
                    style={{
                      transform: `scale(${guiaZoom})`,
                      transformOrigin: "top left",
                      width: `${100 / guiaZoom}%`,
                    }}
                    dangerouslySetInnerHTML={{ __html: htmlGuiaPreenchida }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                  onClick={() => setView("pergunta_honorarios")}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                  onClick={pdfGerado ? handleBaixarPdf : () => void handleGerarPdf()}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando PDF...
                    </>
                  ) : pdfGerado ? (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar PDF
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Gerar PDF
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] transition-shadow hover:shadow-[0_0_30px_rgba(212,160,23,0.6)]"
                  onClick={() => void handleAvancarAposPreview()}
                >
                  Concluir faturamento
                </Button>
              </div>
            </div>
          )}

          {view === "success" && (
            <div className="flex w-full flex-1 items-center justify-center">
              <div className="w-full max-w-md rounded-3xl border border-[#D4A017]/20 bg-black/40 p-8 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
                <h2 className="mt-4 text-2xl font-semibold text-[#F5F5F5]">
                  Faturamento concluído
                </h2>
                <p className="mt-2 text-sm text-[#9CA3AF]">
                  Seus documentos foram processados e o fluxo foi finalizado com sucesso.
                </p>

                <div className="mt-6 space-y-3">
                  <Button
                    type="button"
                    className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black"
                    onClick={handleNovaDescricao}
                  >
                    Iniciar novo faturamento
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                    onClick={() => navigate("/medico/faturamentos")}
                  >
                    Ir para meus faturamentos
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showAnalyzingScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-md rounded-3xl border border-[#D4A017]/20 bg-[#111111] text-[#F5F5F5] shadow-2xl">
            <CardContent className="p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D4A017]/15 text-[#FFD700]">
                <Brain className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{getAnalyzingDocTitle()}</h3>
              <p className="mt-2 text-sm text-[#9CA3AF]">{getAnalyzingStepDescription()}</p>
              <Progress value={analyzingProgress} className="mt-5 h-2 bg-white/10" />
              <p className="mt-3 text-xs text-[#D4A017]">{analyzingProgress}% concluído</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showConsistencyTable && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
          <ConsistencyResultsTable
            results={allConsistencyResults}
            onVoltar={() => {
              setShowConsistencyTable(false);
              setPendingNavigation(null);
              setView("upload_descricao");
            }}
            onContinue={() => {
              void (async () => {
                if (faturamentoId) {
                  await markResultsAsIgnored(faturamentoId, "apos_descricao_cirurgica");
                }
                setShowConsistencyTable(false);
                const nextAction = pendingNavigation;
                setPendingNavigation(null);
                nextAction?.();
              })();
            }}
          />
        </div>
      )}

      <ProcedureReviewDialog
        open={showProcedureReview}
        procedimentos={procedimentosRevisao}
        faturamentoId={faturamentoId}
        userId={currentUserId}
        onConfirm={handleProcedureReviewConfirm}
        onClose={handleProcedureReviewClose}
        onProcedimentosUpdated={setProcedimentosRevisao}
      />

      {showEmailDialog && faturamentoId ? (
        <SendBillingEmailsDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          faturamentoId={faturamentoId}
          userEmail={medicoEmail}
          userName={medicoNome}
          userCrm={medicoCrm}
          instituicaoCirurgiaNome={selectedHospitalName}
          instituicaoFaturamentoNome={selectedClinicaName}
          instituicoesDiferentes={selectedHospitalId !== selectedClinicaId}
          onEmailsSent={handleEmailsSent}
          onSkip={handleSkipEmails}
        />
      ) : null}
    </div>
  );
};

export default MedicoUploadDescricaoCirurgica;
