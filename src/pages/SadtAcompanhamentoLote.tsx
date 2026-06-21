import React, { useCallback, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
  XCircle,
  SkipForward,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { compressFiles } from "@/utils/image-compression";
import {
  callProcessSadt,
  expandFilesToUploadItems,
  uploadSadtItems,
  type GuiaExistente,
} from "@/utils/sadt-acompanhamento-upload";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { CREDITS_PER_ACOMPANHAMENTO } from "@/utils/credits";

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

const SadtAcompanhamentoLote: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMedicoRoute = location.pathname.startsWith("/medico/");
  const listPath = isMedicoRoute
    ? "/medico/sadt-acompanhamento"
    : "/admin/sadt-acompanhamento";

  const creditBalance = useCreditBalance();

  const [items, setItems] = useState<GuiaItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Resolve a decisão do usuário (duplicada / não-pertence) durante o lote.
  const decisionResolverRef = useRef<((choice: "confirm" | "skip") => void) | null>(
    null,
  );

  const updateItem = useCallback((id: string, patch: Partial<GuiaItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }, []);

  const handleAddFiles = (selected: FileList | File[]) => {
    const arr = Array.from(selected);
    const allowed = arr.filter(isAllowed);

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

  // Aguarda a decisão do usuário no modal de conflito.
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

  // Processa UMA guia (um arquivo) por completo, tratando conflitos.
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

    // Loop: reenvia (forçando) após a decisão do usuário, sem novo upload.
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

    // Bloqueia o lote quando não há créditos para ao menos um acompanhamento
    // (cada acompanhamento = 2 créditos). As guias além do saldo também são
    // recusadas individualmente pela edge function.
    if (
      creditBalance.remaining !== null &&
      creditBalance.remaining < CREDITS_PER_ACOMPANHAMENTO
    ) {
      showError(
        "Créditos insuficientes para enviar acompanhamentos. Aguarde a renovação do seu pacote ou adquira mais créditos.",
      );
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      showError("Faça login novamente.");
      navigate("/login");
      return;
    }
    const userId = userData.user.id;

    setIsProcessing(true);
    setFinished(false);

    // Processa apenas as guias ainda pendentes (permite "tentar novamente").
    const pendingItems = items.filter(
      (it) => it.status === "pending" || it.status === "error",
    );

    for (const item of pendingItems) {
      await processOne(item, userId);
    }

    setCurrentId(null);
    setIsProcessing(false);
    setFinished(true);

    // Na área do médico, ao concluir o envio das guias, volta para o início.
    if (isMedicoRoute) {
      showSuccess("Envio concluído.");
      navigate("/medico/dashboard");
    }
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
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="sadt-acompanhamento" />

        <div className="flex min-w-0 flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          <header className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(listPath)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-800"
                title="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex flex-col">
                <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
                  Enviar guias em lote
                </h1>
                <p className="mt-1 text-[13px] text-slate-500">
                  Selecione vários arquivos — cada arquivo é uma guia e o
                  sistema processa uma a uma.
                </p>
              </div>
            </div>

            <AdminHeaderActions notificationsCount={0} />
          </header>

          <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <main className="flex-1 space-y-4">
              <Card className="rounded-[22px] border-[#E0E7F5] bg-white shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-[14px] font-semibold text-slate-900">
                        Guias selecionadas
                      </CardTitle>
                      <CardDescription className="mt-1 text-[12px] text-slate-500">
                        Total:{" "}
                        <span className="font-medium text-teal-600">
                          {items.length} guia(s)
                        </span>
                        {isProcessing && (
                          <span className="ml-2 text-slate-400">
                            • {processedCount}/{items.length} processadas
                          </span>
                        )}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ACCEPT}
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="gap-2 rounded-[14px] text-sm"
                      >
                        <Upload className="h-4 w-4" />
                        Adicionar arquivos
                      </Button>
                      {items.length > 0 && (
                        <Button
                          variant="ghost"
                          onClick={handleClear}
                          disabled={isProcessing}
                          className="gap-2 rounded-[14px] text-sm text-slate-500"
                        >
                          <Trash2 className="h-4 w-4" />
                          Limpar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  {items.length === 0 ? (
                    <label
                      htmlFor="lote-files"
                      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center transition hover:border-teal-400/60 hover:bg-teal-50/40"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files?.length) {
                          handleAddFiles(e.dataTransfer.files);
                        }
                      }}
                    >
                      <input
                        id="lote-files"
                        type="file"
                        multiple
                        accept={ACCEPT}
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600/10 text-teal-600">
                        <Upload className="h-7 w-7" />
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        Arraste os arquivos aqui ou clique para selecionar
                      </span>
                      <span className="text-xs text-slate-400">
                        Cada arquivo = 1 guia. PDF de várias páginas conta como
                        uma guia. Formatos: PNG, JPEG, GIF, WEBP e PDF.
                      </span>
                    </label>
                  ) : (
                    <div className="space-y-2">
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
                  )}

                  {finished && !isProcessing && items.length > 0 && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                      <span className="font-semibold text-slate-800">
                        Lote concluído.
                      </span>{" "}
                      {counts.success ?? 0} importada(s) · {counts.skipped ?? 0}{" "}
                      pulada(s) · {counts.error ?? 0} com erro.
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    {finished && (
                      <Button
                        variant="outline"
                        onClick={() => navigate(listPath)}
                        className="rounded-[14px] text-sm"
                      >
                        Ver SADTs
                      </Button>
                    )}
                    <Button
                      onClick={handleProcessBatch}
                      disabled={isProcessing || items.length === 0}
                      className="gap-2 rounded-[14px] bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : finished ? (
                        "Processar pendentes"
                      ) : (
                        `Processar lote (${items.length})`
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </div>

      {/* Modal de decisão (duplicada / não-pertence) */}
      <Dialog
        open={!!pendingDecision}
        onOpenChange={(open) => {
          // Fechar pelo "X"/overlay equivale a pular esta guia.
          if (!open) resolveDecision("skip");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle>
              {pendingDecision?.type === "duplicate"
                ? "Guia já enviada anteriormente"
                : "Guia não pertence ao médico"}
            </DialogTitle>
            <DialogDescription>
              {pendingDecision?.type === "duplicate"
                ? "Esta guia já existe no sistema. Deseja enviar mesmo assim ou pular?"
                : "O profissional identificado na guia é diferente do cadastro. Deseja importar mesmo assim ou pular?"}
            </DialogDescription>
          </DialogHeader>

          {pendingDecision && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {pendingDecision.fileName}
              </p>
              {pendingDecision.type === "duplicate" ? (
                <div className="space-y-1.5">
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
                    value={formatDate(
                      pendingDecision.guia_existente?.created_at,
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
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
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => resolveDecision("skip")}
              className="gap-2"
            >
              <SkipForward className="h-4 w-4" />
              Pular esta guia
            </Button>
            <Button
              onClick={() => resolveDecision("confirm")}
              className="gap-2 bg-teal-600 text-white hover:bg-teal-700"
            >
              {pendingDecision?.type === "duplicate"
                ? "Enviar mesmo assim"
                : "Importar mesmo assim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <div className="flex justify-between gap-4">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right text-xs font-medium text-slate-700">
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
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors ${
        isCurrent
          ? "border-teal-300 bg-teal-50/60"
          : "border-slate-100 bg-white hover:bg-slate-50/60"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-slate-800">
            {item.file.name}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
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
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Remover"
          >
            <X className="h-4 w-4" />
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
      className: "bg-slate-100 text-slate-500",
      icon: null,
    },
    uploading: {
      label: "Enviando",
      className: "bg-sky-100 text-sky-700",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    processing: {
      label: "Processando",
      className: "bg-amber-100 text-amber-700",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    success: {
      label: "Importada",
      className: "bg-emerald-100 text-emerald-700",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    skipped: {
      label: "Pulada",
      className: "bg-slate-100 text-slate-500",
      icon: <SkipForward className="h-3 w-3" />,
    },
    error: {
      label: "Erro",
      className: "bg-rose-100 text-rose-700",
      icon: <XCircle className="h-3 w-3" />,
    },
  };
  const { label, className, icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}

export default SadtAcompanhamentoLote;
