import React, { useState, useRef, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
  Loader2,
  Camera,
  RefreshCw,
  RotateCcw,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

export interface ProcedimentoRevisao {
  item_faturamento_id: string | null;
  codigo_original: string | null;
  descricao_original: string | null;
  codigo_validado: string | null;
  descricao_validada: string | null;
  metodo_validacao: string;
  similaridade: number | null;
  necessita_revisao: boolean;
}

interface ProcedureReviewDialogProps {
  open: boolean;
  procedimentos: ProcedimentoRevisao[];
  faturamentoId?: string | null;
  userId?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  onProcedimentosUpdated?: (novos: ProcedimentoRevisao[]) => void;
}

interface CbhpmSearchResult {
  codigo: string;
  descricao: string;
  porte: string | null;
}

type InconsistentMode = "search" | "camera" | null;

const FUNCTION_URL =
  "https://pokyribuibmbeorrcsgk.supabase.co/functions/v1/process-descricao-cirurgica";

const ProcedureReviewDialog: React.FC<ProcedureReviewDialogProps> = ({
  open,
  procedimentos,
  faturamentoId,
  userId,
  onConfirm,
  onClose,
  onProcedimentosUpdated,
}) => {
  const [corrections, setCorrections] = useState<
    Record<number, { codigo: string; descricao: string }>
  >({});
  const [searchQuery, setSearchQuery] = useState<Record<number, string>>({});
  const [searchResults, setSearchResults] = useState<
    Record<number, CbhpmSearchResult[]>
  >({});
  const [searching, setSearching] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Per-item mode: which inconsistent item is expanded and in which mode
  const [itemMode, setItemMode] = useState<Record<number, InconsistentMode>>({});

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActiveFor, setCameraActiveFor] = useState<number | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<Record<number, string>>({}); // base64
  const [reanalyzing, setReanalyzing] = useState<Record<number, boolean>>({});
  const [reanalysisResult, setReanalysisResult] = useState<
    Record<number, { found: boolean; codigo?: string; descricao?: string; message?: string }>
  >({});

  if (!open) return null;

  const totalProcedimentos = procedimentos.length;
  const qtdInconsistentes = procedimentos.filter((p) => p.necessita_revisao).length;

  if (totalProcedimentos === 0) {
    onConfirm();
    return null;
  }

  // ── Camera helpers ──────────────────────────────────────────────────────────

  const startCamera = async (index: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setCameraActiveFor(index);
      // wait for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      showError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActiveFor(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const capturePhoto = (index: number) => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhoto((prev) => ({ ...prev, [index]: dataUrl }));
    stopCamera();
  };

  const retakePhoto = (index: number) => {
    setCapturedPhoto((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setReanalysisResult((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    void startCamera(index);
  };

  // ── Re-analysis ─────────────────────────────────────────────────────────────

  const handleReanalyze = async (index: number) => {
    const photo = capturedPhoto[index];
    if (!photo) return;

    if (!faturamentoId || !userId) {
      showError("Dados do faturamento não disponíveis para re-análise.");
      return;
    }

    setReanalyzing((prev) => ({ ...prev, [index]: true }));
    setReanalysisResult((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    try {
      // Upload the captured image to storage
      const blob = await (await fetch(photo)).blob();
      const timestamp = Date.now();
      const filePath = `descricao_cirurgica/${userId}/${timestamp}-retake-${index}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("NPS-pro")
        .upload(filePath, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadError) throw new Error(`Falha ao enviar imagem: ${uploadError.message}`);

      // Call the edge function to re-process
      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          faturamentoId,
          files: [{ path: filePath }],
          retake_for_index: index,
        }),
      });

      let json: any = null;
      try { json = await response.json(); } catch { /* ignore */ }

      if (!response.ok || json?.error) {
        throw new Error(json?.error ?? "Erro ao re-analisar a imagem.");
      }

      // Check if the specific procedure was resolved
      const revisaoData = json?.revisao_procedimentos as ProcedimentoRevisao[] | undefined;

      if (revisaoData && revisaoData.length > 0) {
        // Find the matching procedure by original code
        const proc = procedimentos[index];
        const match = revisaoData.find(
          (r) =>
            r.codigo_original === proc.codigo_original ||
            r.descricao_original === proc.descricao_original
        );

        if (match && !match.necessita_revisao && match.codigo_validado) {
          setReanalysisResult((prev) => ({
            ...prev,
            [index]: {
              found: true,
              codigo: match.codigo_validado!,
              descricao: match.descricao_validada ?? match.descricao_original ?? "",
            },
          }));
          // Auto-apply correction
          setCorrections((prev) => ({
            ...prev,
            [index]: {
              codigo: match.codigo_validado!,
              descricao: match.descricao_validada ?? match.descricao_original ?? "",
            },
          }));
          showSuccess("Código reconhecido com sucesso na nova foto!");
          // Notify parent of updated list if provided
          if (onProcedimentosUpdated) onProcedimentosUpdated(revisaoData);
        } else {
          setReanalysisResult((prev) => ({
            ...prev,
            [index]: {
              found: false,
              message: "Código não reconhecido na nova imagem. Tente buscar manualmente.",
            },
          }));
        }
      } else {
        setReanalysisResult((prev) => ({
          ...prev,
          [index]: { found: false, message: "Nenhum procedimento identificado na imagem." },
        }));
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro ao re-analisar.");
      setReanalysisResult((prev) => ({
        ...prev,
        [index]: { found: false, message: err instanceof Error ? err.message : "Erro desconhecido." },
      }));
    } finally {
      setReanalyzing((prev) => ({ ...prev, [index]: false }));
    }
  };

  // ── CBHPM search ────────────────────────────────────────────────────────────

  const handleSearchCbhpm = async (index: number, query: string) => {
    if (!query || query.length < 3) {
      setSearchResults((prev) => ({ ...prev, [index]: [] }));
      return;
    }
    setSearching((prev) => ({ ...prev, [index]: true }));
    try {
      const isCodeSearch = /^\d+$/.test(query.trim());
      let results: CbhpmSearchResult[] = [];
      if (isCodeSearch) {
        const { data, error } = await supabase
          .from("cbhpm_cirurgias")
          .select("codigo, descricao, porte")
          .like("codigo", `${query.trim()}%`)
          .limit(10);
        if (!error && data) results = data as CbhpmSearchResult[];
      } else {
        const { data, error } = await supabase
          .from("cbhpm_cirurgias")
          .select("codigo, descricao, porte")
          .ilike("descricao", `%${query.trim()}%`)
          .limit(10);
        if (!error && data) results = data as CbhpmSearchResult[];
      }
      setSearchResults((prev) => ({ ...prev, [index]: results }));
    } catch {
      // ignore
    } finally {
      setSearching((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleSelectResult = (index: number, result: CbhpmSearchResult) => {
    setCorrections((prev) => ({
      ...prev,
      [index]: { codigo: result.codigo, descricao: result.descricao },
    }));
    setItemMode((prev) => ({ ...prev, [index]: null }));
    setSearchResults((prev) => ({ ...prev, [index]: [] }));
    setSearchQuery((prev) => ({ ...prev, [index]: "" }));
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < procedimentos.length; i++) {
        const proc = procedimentos[i];
        const correction = corrections[i];
        if (!proc.necessita_revisao || !correction) continue;

        if (proc.item_faturamento_id) {
          const { error } = await supabase
            .from("itens_faturamento")
            .update({
              codigo_procedimento: correction.codigo,
              descricao_procedimento: correction.descricao,
              updated_at: new Date().toISOString(),
            })
            .eq("id", proc.item_faturamento_id);
          if (error) showError(`Erro ao atualizar ${correction.codigo}: ${error.message}`);
        } else if (correction.codigo) {
          const faturamentoItem = procedimentos.find((p) => p.item_faturamento_id);
          if (faturamentoItem?.item_faturamento_id) {
            const { data: itemData } = await supabase
              .from("itens_faturamento")
              .select("faturamento_id, medico_id")
              .eq("id", faturamentoItem.item_faturamento_id)
              .single();
            if (itemData) {
              await supabase.from("itens_faturamento").insert({
                faturamento_id: itemData.faturamento_id,
                medico_id: itemData.medico_id,
                codigo_procedimento: correction.codigo,
                descricao_procedimento: correction.descricao,
                quantidade_autorizada: 1,
                quantidade_executada: 1,
                quantidade: 1,
                status_item: "pendente",
              });
            }
          }
        }
      }
      showSuccess("Procedimentos revisados com sucesso!");
      onConfirm();
    } catch (err) {
      showError("Erro ao salvar as correções dos procedimentos.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-3">
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl border border-[#D4A017]/20 bg-[#0f0f0f] shadow-[0_0_60px_rgba(212,160,23,0.15)]">

        {/* Header */}
        <div className="flex-shrink-0 border-b border-[#D4A017]/15 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#F5F5F5] leading-tight">
                  Revisão de Procedimentos
                </h2>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                  {qtdInconsistentes} de {totalProcedimentos} procedimento(s) precisam de confirmação
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-[#9CA3AF] border border-[#D4A017]/15 hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          <p className="text-[10px] text-[#9CA3AF] leading-relaxed">
            Itens em{" "}
            <span className="text-amber-400 font-semibold">amarelo</span>{" "}
            podem ter código incorreto — corrija antes de gerar a guia.
          </p>

          {procedimentos.map((proc, index) => {
            const needsReview = proc.necessita_revisao;
            const correction = corrections[index];
            const isResolved = needsReview && !!correction;
            const mode = itemMode[index] ?? null;
            const photo = capturedPhoto[index];
            const reanalysis = reanalysisResult[index];
            const isReanalyzing = reanalyzing[index] ?? false;
            const isCameraActive = cameraActiveFor === index;

            // ── OK item ──
            if (!needsReview) {
              return (
                <div key={index} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/20">
                          {proc.codigo_validado || proc.codigo_original || "—"}
                        </span>
                        <span className="text-[9px] text-emerald-400/70 uppercase font-semibold tracking-wider">OK</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-[#D1D5DB] leading-snug">
                        {proc.descricao_validada || proc.descricao_original || "Sem descrição"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // ── Inconsistent item ──
            return (
              <div
                key={index}
                className={`rounded-lg border p-3 transition-colors ${
                  isResolved
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/40 bg-amber-500/[0.07]"
                }`}
              >
                {/* Status label */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  {isResolved ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                  )}
                  <span className={`text-[9px] font-semibold uppercase tracking-wider ${isResolved ? "text-emerald-400" : "text-amber-400"}`}>
                    {isResolved ? "Corrigido" : "Verificar código"}
                  </span>
                </div>

                {/* Original data */}
                <div className="mb-2">
                  <p className="text-[9px] text-[#6B7280] uppercase tracking-wider mb-1">
                    Extraído da descrição cirúrgica
                  </p>
                  <div className="flex items-start gap-1.5">
                    <span className="inline-block rounded bg-[#D4A017]/15 px-1.5 py-0.5 text-[10px] font-mono text-[#D4A017] border border-[#D4A017]/25 flex-shrink-0">
                      {proc.codigo_original || "???"}
                    </span>
                    <p className="text-[10px] text-[#F5F5F5] leading-snug uppercase">
                      {proc.descricao_original || "Sem descrição"}
                    </p>
                  </div>
                </div>

                {/* Resolved state */}
                {isResolved && correction && (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/20 mr-1.5">
                        {correction.codigo}
                      </span>
                      <span className="text-[10px] text-emerald-200">
                        {correction.descricao.length > 60
                          ? correction.descricao.slice(0, 60) + "…"
                          : correction.descricao}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCorrections((prev) => { const n = { ...prev }; delete n[index]; return n; });
                        setItemMode((prev) => ({ ...prev, [index]: null }));
                        setCapturedPhoto((prev) => { const n = { ...prev }; delete n[index]; return n; });
                        setReanalysisResult((prev) => { const n = { ...prev }; delete n[index]; return n; });
                      }}
                      className="text-[9px] text-[#9CA3AF] hover:text-[#F5F5F5] underline flex-shrink-0"
                    >
                      Alterar
                    </button>
                  </div>
                )}

                {/* Action buttons when not resolved */}
                {!isResolved && mode === null && (
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setItemMode((prev) => ({ ...prev, [index]: "search" }))}
                      className="flex items-center gap-1 text-[10px] text-[#D4A017] hover:text-[#FFD700] transition-colors"
                    >
                      <Search className="h-3 w-3" />
                      Buscar na CBHPM
                    </button>
                    <span className="text-[#4B5563] text-[10px]">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setItemMode((prev) => ({ ...prev, [index]: "camera" }));
                        void startCamera(index);
                      }}
                      className="flex items-center gap-1 text-[10px] text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
                    >
                      <Camera className="h-3 w-3" />
                      Nova foto
                    </button>
                  </div>
                )}

                {/* ── SEARCH MODE ── */}
                {!isResolved && mode === "search" && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Código ou descrição..."
                        value={searchQuery[index] || ""}
                        onChange={(e) => setSearchQuery((prev) => ({ ...prev, [index]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSearchCbhpm(index, searchQuery[index] || "");
                        }}
                        className="h-7 rounded-md border-[#D4A017]/20 bg-black/60 text-[10px] text-[#F5F5F5] placeholder:text-[#6B7280] focus:border-[#D4A017]/50"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 rounded-md bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/30 hover:bg-[#D4A017]/30 px-2"
                        onClick={() => void handleSearchCbhpm(index, searchQuery[index] || "")}
                        disabled={searching[index]}
                      >
                        {searching[index] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setItemMode((prev) => ({ ...prev, [index]: null }))}
                        className="h-7 px-1.5 text-[#9CA3AF] hover:text-[#F5F5F5]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    {(searchResults[index] || []).length > 0 && (
                      <div className="max-h-36 overflow-y-auto rounded-md border border-[#D4A017]/15 bg-black/60">
                        {searchResults[index].map((result) => (
                          <button
                            key={result.codigo}
                            type="button"
                            onClick={() => handleSelectResult(index, result)}
                            className="flex w-full items-start gap-1.5 border-b border-[#D4A017]/10 px-2.5 py-1.5 text-left hover:bg-[#D4A017]/10 transition-colors last:border-b-0"
                          >
                            <span className="inline-block rounded bg-[#D4A017]/15 px-1.5 py-0.5 text-[9px] font-mono text-[#D4A017] border border-[#D4A017]/20 flex-shrink-0 mt-0.5">
                              {result.codigo}
                            </span>
                            <span className="text-[10px] text-[#F5F5F5] leading-tight">{result.descricao}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searching[index] && (
                      <p className="text-[9px] text-[#9CA3AF] flex items-center gap-1">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Buscando...
                      </p>
                    )}
                  </div>
                )}

                {/* ── CAMERA MODE ── */}
                {!isResolved && mode === "camera" && (
                  <div className="mt-2 space-y-2">
                    {/* Camera viewfinder */}
                    {isCameraActive && !photo && (
                      <div className="relative rounded-lg overflow-hidden border border-[#60A5FA]/30 bg-black">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full max-h-48 object-cover"
                        />
                        <div className="absolute inset-0 pointer-events-none">
                          {/* Corner guides */}
                          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#60A5FA]/70 rounded-tl" />
                          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#60A5FA]/70 rounded-tr" />
                          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#60A5FA]/70 rounded-bl" />
                          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#60A5FA]/70 rounded-br" />
                        </div>
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => capturePhoto(index)}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-100 transition-colors"
                          >
                            <Camera className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              stopCamera();
                              setItemMode((prev) => ({ ...prev, [index]: null }));
                            }}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-[#9CA3AF] border border-white/20 hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Captured photo preview */}
                    {photo && (
                      <div className="space-y-2">
                        <div className="relative rounded-lg overflow-hidden border border-[#60A5FA]/30">
                          <img src={photo} alt="Foto capturada" className="w-full max-h-40 object-cover" />
                          <div className="absolute top-1.5 right-1.5 flex gap-1">
                            <button
                              type="button"
                              onClick={() => retakePhoto(index)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[#9CA3AF] hover:text-white border border-white/20"
                              title="Tirar nova foto"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Re-analysis result */}
                        {reanalysis && (
                          <div className={`rounded-md border px-2.5 py-2 text-[10px] ${
                            reanalysis.found
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-red-500/30 bg-red-500/10 text-red-300"
                          }`}>
                            {reanalysis.found ? (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                <span>
                                  Código reconhecido:{" "}
                                  <span className="font-mono font-semibold">{reanalysis.codigo}</span>
                                  {" — "}{reanalysis.descricao?.slice(0, 50)}{(reanalysis.descricao?.length ?? 0) > 50 ? "…" : ""}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                <span>{reanalysis.message}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Analyze button */}
                        {!reanalysis && (
                          <Button
                            type="button"
                            size="sm"
                            className="w-full h-8 rounded-md bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/30 hover:bg-[#60A5FA]/30 text-[10px] font-semibold"
                            onClick={() => void handleReanalyze(index)}
                            disabled={isReanalyzing}
                          >
                            {isReanalyzing ? (
                              <>
                                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                Analisando imagem...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-1.5 h-3 w-3" />
                                Analisar nova foto
                              </>
                            )}
                          </Button>
                        )}

                        {/* If not found, offer search fallback */}
                        {reanalysis && !reanalysis.found && (
                          <button
                            type="button"
                            onClick={() => setItemMode((prev) => ({ ...prev, [index]: "search" }))}
                            className="flex items-center gap-1 text-[10px] text-[#D4A017] hover:text-[#FFD700]"
                          >
                            <Search className="h-3 w-3" />
                            Buscar manualmente na CBHPM
                          </button>
                        )}
                      </div>
                    )}

                    {/* Camera not yet started (loading) */}
                    {!isCameraActive && !photo && (
                      <div className="flex items-center justify-center h-20 rounded-lg border border-[#60A5FA]/20 bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-[#60A5FA]" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-[#D4A017]/15 px-4 py-3 flex gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-9 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10 text-xs"
            onClick={onClose}
            disabled={saving}
          >
            Pular revisão
          </Button>
          <Button
            type="button"
            className="flex-1 h-9 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] text-xs"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              "Confirmar e continuar"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProcedureReviewDialog;
