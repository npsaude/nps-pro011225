import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
  XCircle,
  SkipForward,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MEDICO_LOGO_URL } from "@/constants/medico-brand";
import { showError } from "@/utils/toast";
import { compressFiles } from "@/utils/image-compression";
import MedicoFloatingNav from "@/components/medico/MedicoFloatingNav";
import {
  callProcessSadt,
  expandFilesToUploadItems,
  uploadSadtItems,
  type GuiaExistente,
} from "@/utils/sadt-acompanhamento-upload";

type GuiaStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "success"
  | "skipped"
  | "error";

interface GuiaItem {
  id: string;
  file: File;
  status: GuiaStatus;
  message?: string;
  numeroGuia?: string | null;
  beneficiario?: string | null;
}

type PendingDecision =
  | {
      id: string;
      fileName: string;
      type: "duplicate";
      numero_guia_prestador: string | null;
      nome_beneficiario: string | null;
      guia_existente: GuiaExistente | null;
    }
  | {
      id: string;
      fileName: string;
      type: "not_owner";
      profissional_nome_guia: string | null;
      profissional_conselho_guia: string | null;
      nome_beneficiario: string | null;
      numero_guia_prestador: string | null;
    };

const ACCEPT = "image/*,application/pdf";

const isAllowed = (file: File) =>
  file.type.startsWith("image/") || file.type === "application/pdf";

let uidCounter = 0;
const nextUid = () => `guia_${Date.now()}_${uidCounter++}`;

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function formatCurrency(val: string | number | null | undefined) {
  if (val === null || val === undefined) return "—";
  const n = Number(val);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MedicoUploadSadtAcompanhamentoLote: React.FC = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState<GuiaItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const decisionResolverRef = useRef<((choice: "confirm" | "skip") => void) | null>(
    null,
  );

  const updateItem = useCallback((id: string, patch: Partial<GuiaItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }, []);

  const handleAddFiles = (selected: FileList | File[]) => {
    const allowed = Array.from(selected).filter(isAllowed);
    if (allowed.length === 0) {
      showError(
        "Nenhum arquivo válido. Envie imagens (PNG, JPEG, GIF, WEBP) ou PDFs.",
      );
      return;
    }
    void compressFiles(allowed).then((compressed) => {
      setItems((prev) => [
        ...prev,
        ...compressed.map((file) => ({
          id: nextUid(),
          file,
          status: "pending" as GuiaStatus,
        })),
      ]);
      setFinished(false);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    handleAddFiles(event.target.files);
    event.target.value = "";
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClear = () => {
    setItems([]);
    setFinished(false);
  };

  const waitForDecision = () =>
    new Promise<"confirm" | "skip">((resolve) => {
      decisionResolverRef.current = resolve;
    });

  const resolveDecision = (choice: "confirm" | "skip") => {
    const resolver = decisionResolverRef.current;
    decisionResolverRef.current = null;
    setPendingDecision(null);
    resolver?.(choice);
  };

  const processOne = async (item: GuiaItem, userId: string) => {
    setCurrentId(item.id);

    let paths: string[];
    try {
      updateItem(item.id, { status: "uploading", message: undefined });
      const uploadItems = await expandFilesToUploadItems([item.file]);
      if (uploadItems.length === 0) {
        throw new Error("Nenhum conteúdo válido gerado para envio.");
      }
      paths = await uploadSadtItems(userId, uploadItems);
    } catch (err) {
      updateItem(item.id, {
        status: "error",
        message:
          err instanceof Error ? err.message : "Falha ao enviar o arquivo.",
      });
      return;
    }

    let forceInsert = false;
    let forceOwnership = false;

    while (true) {
      updateItem(item.id, { status: "processing" });
      const res = await callProcessSadt({
        userId,
        paths,
        forceInsert,
        forceOwnership,
      });

      if (res.kind === "success") {
        updateItem(item.id, { status: "success", message: undefined });
        return;
      }

      if (res.kind === "error") {
        updateItem(item.id, { status: "error", message: res.message });
        return;
      }

      if (res.kind === "not_owner") {
        updateItem(item.id, {
          numeroGuia: res.numero_guia_prestador,
          beneficiario: res.nome_beneficiario,
        });
        setPendingDecision({
          id: item.id,
          fileName: item.file.name,
          type: "not_owner",
          profissional_nome_guia: res.profissional_nome_guia,
          profissional_conselho_guia: res.profissional_conselho_guia,
          nome_beneficiario: res.nome_beneficiario,
          numero_guia_prestador: res.numero_guia_prestador,
        });
        const choice = await waitForDecision();
        if (choice === "skip") {
          updateItem(item.id, {
            status: "skipped",
            message: "Pulada (não pertence ao médico).",
          });
          return;
        }
        forceOwnership = true;
        continue;
      }

      // duplicate
      updateItem(item.id, {
        numeroGuia: res.numero_guia_prestador,
        beneficiario: res.nome_beneficiario,
      });
      setPendingDecision({
        id: item.id,
        fileName: item.file.name,
        type: "duplicate",
        numero_guia_prestador: res.numero_guia_prestador,
        nome_beneficiario: res.nome_beneficiario,
        guia_existente: res.guia_existente,
      });
      const choice = await waitForDecision();
      if (choice === "skip") {
        updateItem(item.id, {
          status: "skipped",
          message: "Pulada (guia duplicada).",
        });
        return;
      }
      forceInsert = true;
      forceOwnership = true;
    }
  };

  const handleProcessBatch = async () => {
    if (items.length === 0 || isProcessing) return;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      showError("Faça login novamente.");
      navigate("/login");
      return;
    }
    const userId = userData.user.id;

    setIsProcessing(true);
    setFinished(false);

    const pendingItems = items.filter(
      (it) => it.status === "pending" || it.status === "error",
    );

    for (const item of pendingItems) {
      await processOne(item, userId);
    }

    setCurrentId(null);
    setIsProcessing(false);
    setFinished(true);
  };

  const counts = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        acc[it.status] = (acc[it.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<GuiaStatus, number>,
    );
  }, [items]);

  const processedCount =
    (counts.success ?? 0) + (counts.skipped ?? 0) + (counts.error ?? 0);

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

        <main className="flex w-full flex-1 flex-col items-center justify-start">
          <div className="mt-2 flex w-full max-w-md flex-col">
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept={ACCEPT}
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
                Enviar Guias SADT em lote
              </h1>
              <p className="mt-1 text-xs text-[#9CA3AF] sm:text-sm">
                Cada arquivo é uma guia. Selecione vários e o sistema processa
                uma a uma.
              </p>
            </div>

            {items.length === 0 ? (
              <>
                <label
                  htmlFor="lote-files-mobile"
                  className="bg-[#1a1a1a] border-2 border-dashed border-[#D4A017]/30 rounded-2xl p-8 hover:border-[#D4A017]/60 hover:bg-[#D4A017]/5 transition-all cursor-pointer group text-center"
                >
                  <input
                    id="lote-files-mobile"
                    type="file"
                    multiple
                    accept={ACCEPT}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#FFD700] to-[#D4A017] flex items-center justify-center shadow-[0_0_30px_rgba(212,160,23,0.4)] group-hover:shadow-[0_0_40px_rgba(212,160,23,0.6)] transition-shadow">
                      <Upload className="h-8 w-8 text-black" />
                    </div>
                    <p className="text-[#F5F5F5] font-medium">
                      Adicionar Arquivos
                    </p>
                    <p className="text-[#9CA3AF] text-sm">Câmera ou Galeria</p>
                    <p className="text-[#6B7280] text-[11px]">
                      Cada arquivo = 1 guia. PDF de várias páginas conta como
                      uma guia. PNG, JPEG, GIF, WEBP e PDF.
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
                    Suas Guias ({items.length})
                    {isProcessing && (
                      <span className="ml-2 font-normal text-[#9CA3AF]">
                        • {processedCount}/{items.length}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isProcessing}
                      className="h-7 rounded-full border-[#D4A017]/30 bg-black/40 text-[11px] font-semibold text-[#D4A017] hover:bg-[#D4A017]/10 hover:text-[#FFD700]"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      + Adicionar mais
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isProcessing}
                      className="h-7 rounded-full text-[11px] text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
                      onClick={handleClear}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                  {items.map((it) => (
                    <GuiaRow
                      key={it.id}
                      item={it}
                      isCurrent={currentId === it.id}
                      canRemove={!isProcessing}
                      onRemove={() => handleRemove(it.id)}
                    />
                  ))}
                </div>

                {finished && !isProcessing && (
                  <div className="mt-4 rounded-2xl border border-[#D4A017]/20 bg-black/50 px-4 py-3 text-xs text-[#9CA3AF]">
                    <span className="font-semibold text-[#F5F5F5]">
                      Lote concluído.
                    </span>{" "}
                    {counts.success ?? 0} importada(s) · {counts.skipped ?? 0}{" "}
                    pulada(s) · {counts.error ?? 0} com erro.
                  </div>
                )}

                <Button
                  type="button"
                  className="mt-6 h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] hover:scale-[1.01] transition-all duration-300 disabled:opacity-70"
                  disabled={isProcessing || items.length === 0}
                  onClick={handleProcessBatch}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : finished ? (
                    "Processar pendentes"
                  ) : (
                    `Processar lote (${items.length})`
                  )}
                </Button>

                {finished && !isProcessing && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 text-xs text-[#9CA3AF] hover:bg-[#D4A017]/5 hover:text-[#D4A017]"
                    onClick={() => navigate("/medico/sadt-acompanhamento")}
                  >
                    Ver SADTs
                  </Button>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modal de decisão (duplicada / não-pertence) */}
      {pendingDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0f0f0f] border border-amber-500/30 px-6 py-7 shadow-[0_0_40px_rgba(212,160,23,0.15)]">
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30">
                <AlertTriangle className="h-8 w-8 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-[#F5F5F5]">
                {pendingDecision.type === "duplicate"
                  ? "Guia já enviada anteriormente"
                  : "Guia não pertence a você"}
              </h2>
              <p className="mt-1 text-xs text-[#9CA3AF]">
                {pendingDecision.type === "duplicate"
                  ? "Esta guia já existe no sistema. Enviar mesmo assim ou pular?"
                  : "O profissional identificado na guia é diferente do seu cadastro. Importar mesmo assim ou pular?"}
              </p>
            </div>

            <div className="mb-6 rounded-xl bg-black/50 border border-[#D4A017]/15 px-4 py-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#D4A017]/70 mb-1 truncate">
                {pendingDecision.fileName}
              </p>
              {pendingDecision.type === "duplicate" ? (
                <>
                  <DecisionRow
                    label="Nº Guia Prestador"
                    value={pendingDecision.numero_guia_prestador}
                  />
                  <DecisionRow
                    label="Beneficiário"
                    value={
                      pendingDecision.guia_existente?.nome_beneficiario ??
                      pendingDecision.nome_beneficiario
                    }
                  />
                  <DecisionRow
                    label="Valor total"
                    value={formatCurrency(
                      pendingDecision.guia_existente?.valor_total_geral,
                    )}
                  />
                  <DecisionRow
                    label="Enviada em"
                    value={formatDate(pendingDecision.guia_existente?.created_at)}
                  />
                </>
              ) : (
                <>
                  <DecisionRow
                    label="Profissional na guia"
                    value={pendingDecision.profissional_nome_guia}
                  />
                  <DecisionRow
                    label="Nº Conselho"
                    value={pendingDecision.profissional_conselho_guia}
                  />
                  <DecisionRow
                    label="Beneficiário"
                    value={pendingDecision.nome_beneficiario}
                  />
                  <DecisionRow
                    label="Nº Guia"
                    value={pendingDecision.numero_guia_prestador}
                  />
                </>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                className="h-11 w-full rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] font-semibold text-black shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-shadow"
                onClick={() => resolveDecision("confirm")}
              >
                {pendingDecision.type === "duplicate"
                  ? "Enviar mesmo assim"
                  : "Importar mesmo assim"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
                onClick={() => resolveDecision("skip")}
              >
                <SkipForward className="h-4 w-4" />
                Pular esta guia
              </Button>
            </div>
          </div>
        </div>
      )}

      <MedicoFloatingNav />
    </div>
  );
};

function DecisionRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-[#9CA3AF]">{label}</span>
      <span className="text-right font-semibold text-[#F5F5F5] max-w-[60%] truncate">
        {value || "—"}
      </span>
    </div>
  );
}

function GuiaRow({
  item,
  isCurrent,
  canRemove,
  onRemove,
}: {
  item: GuiaItem;
  isCurrent: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const sizeMb = (item.file.size / 1024 / 1024).toFixed(2);
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs text-[#F5F5F5] border transition-colors ${
        isCurrent
          ? "border-[#D4A017]/60 bg-[#D4A017]/10"
          : "border-[#D4A017]/15 bg-black/60 hover:border-[#D4A017]/30"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/20">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] sm:text-xs">{item.file.name}</p>
          <p className="mt-0.5 text-[10px] text-[#6B7280]">
            {sizeMb} MB
            {item.numeroGuia ? ` · Guia ${item.numeroGuia}` : ""}
            {item.message ? ` · ${item.message}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <StatusBadge status={item.status} />
        {canRemove && item.status === "pending" && (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-[#9CA3AF] border border-[#D4A017]/15 hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
            title="Remover"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: GuiaStatus }) {
  const map: Record<
    GuiaStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    pending: {
      label: "Pendente",
      className: "bg-white/5 text-[#9CA3AF] border border-white/10",
      icon: null,
    },
    uploading: {
      label: "Enviando",
      className: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    processing: {
      label: "Processando",
      className: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    success: {
      label: "Importada",
      className: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    skipped: {
      label: "Pulada",
      className: "bg-white/5 text-[#9CA3AF] border border-white/10",
      icon: <SkipForward className="h-3 w-3" />,
    },
    error: {
      label: "Erro",
      className: "bg-rose-500/15 text-rose-300 border border-rose-500/20",
      icon: <XCircle className="h-3 w-3" />,
    },
  };
  const { label, className, icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

export default MedicoUploadSadtAcompanhamentoLote;
