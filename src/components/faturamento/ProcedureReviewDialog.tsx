import React, { useState, useRef, useEffect } from "react";
import { edgeFunctionUrl } from "@/config/supabase";
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
  Loader2,
  Camera,
  RefreshCw,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { authHeaders } from "@/integrations/supabase/auth-header";
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
  /** Quando true, todos os procedimentos ficam editáveis (não só os inconsistentes) */
  editMode?: boolean;
}

interface CbhpmSearchResult {
  codigo: string;
  descricao: string;
  porte: string | null;
}

interface Correction {
  codigo: string;
  descricao: string;
  quantidade: number;
}

type GlobalMode = null | "manual" | "camera";

const FUNCTION_URL =
  edgeFunctionUrl("process-descricao-cirurgica");

const ProcedureReviewDialog: React.FC<ProcedureReviewDialogProps> = ({
  open,
  procedimentos,
  faturamentoId,
  userId,
  onConfirm,
  onClose,
  onProcedimentosUpdated,
  editMode = false,
}) => {
  const [globalMode, setGlobalMode] = useState<GlobalMode>(null);
  const [corrections, setCorrections] = useState<Record<number, Correction>>({});
  const [searchQuery, setSearchQuery] = useState<Record<number, string>>({});
  const [searchResults, setSearchResults] = useState<Record<number, CbhpmSearchResult[]>>({});
  const [searching, setSearching] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalysisResult, setReanalysisResult] = useState<{
    done: boolean;
    resolved: Record<number, Correction>;
    unresolved: number[];
    message?: string;
  } | null>(null);

  // Pre-populate corrections only when the dialog opens (open changes to true)
  // Using a ref to track if we've already initialized for the current open session
  const initializedRef = React.useRef(false);

  useEffect(() => {
    if (!open) {
      // Reset when dialog closes so next open re-initializes
      initializedRef.current = false;
      setCorrections({});
      setGlobalMode(null);
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initial: Record<number, Correction> = {};
    procedimentos.forEach((proc, index) => {
      const shouldPrepopulate = editMode || proc.necessita_revisao;
      const codigo = proc.codigo_validado || proc.codigo_original;
      if (shouldPrepopulate && codigo) {
        initial[index] = {
          codigo,
          descricao: proc.descricao_validada || proc.descricao_original || "",
          quantidade: 1,
        };
      }
    });
    if (Object.keys(initial).length > 0) {
      setCorrections(initial);
    }
    // In editMode, start directly in manual mode
    if (editMode) {
      setGlobalMode("manual");
    }
  }, [open, procedimentos, editMode]);

  if (!open) return null;

  const totalProcedimentos = procedimentos.length;
  const qtdInconsistentes = editMode
    ? totalProcedimentos
    : procedimentos.filter((p) => p.necessita_revisao).length;

  if (totalProcedimentos === 0) {
    onConfirm();
    return null;
  }

  // Em editMode, todos são tratados como "inconsistentes" (editáveis)
  const consistentes = editMode
    ? []
    : procedimentos.map((p, i) => ({ proc: p, index: i })).filter(({ proc }) => !proc.necessita_revisao);

  const inconsistentes = editMode
    ? procedimentos.map((p, i) => ({ proc: p, index: i }))
    : procedimentos.map((p, i) => ({ proc: p, index: i })).filter(({ proc }) => proc.necessita_revisao);

  // ── Camera ──────────────────────────────────────────────────────────────────

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
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
    setCameraActive(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhotos((prev) => [...prev, dataUrl]);
    stopCamera();
  };

  const removePhoto = (photoIndex: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== photoIndex));
    setReanalysisResult(null);
  };

  // ── Re-analysis ─────────────────────────────────────────────────────────────

  const handleReanalyze = async () => {
    if (capturedPhotos.length === 0) return;
    if (!faturamentoId || !userId) {
      showError("Dados do faturamento não disponíveis para re-análise.");
      return;
    }
    setReanalyzing(true);
    setReanalysisResult(null);
    try {
      const uploadedPaths: string[] = [];
      for (let i = 0; i < capturedPhotos.length; i++) {
        const blob = await (await fetch(capturedPhotos[i])).blob();
        const filePath = `descricao_cirurgica/${userId}/${Date.now()}-retake-${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("NPS-pro")
          .upload(filePath, blob, { contentType: "image/jpeg", upsert: false });
        if (uploadError) throw new Error(`Falha ao enviar imagem: ${uploadError.message}`);
        uploadedPaths.push(filePath);
      }

      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ userId, faturamentoId, files: uploadedPaths.map((path) => ({ path })) }),
      });

      let json: { error?: string; revisao_procedimentos?: ProcedimentoRevisao[] } | null = null;
      try { json = await response.json(); } catch { /* ignore */ }
      if (!response.ok || json?.error) throw new Error(json?.error ?? "Erro ao re-analisar a imagem.");

      const revisaoData = json?.revisao_procedimentos as ProcedimentoRevisao[] | undefined;
      if (revisaoData && revisaoData.length > 0) {
        const resolved: Record<number, Correction> = {};
        const unresolved: number[] = [];
        for (const { proc, index } of inconsistentes) {
          const match = revisaoData.find(
            (r) => r.codigo_original === proc.codigo_original || r.descricao_original === proc.descricao_original
          );
          if (match && !match.necessita_revisao && match.codigo_validado) {
            resolved[index] = {
              codigo: match.codigo_validado,
              descricao: match.descricao_validada ?? match.descricao_original ?? "",
              quantidade: 1,
            };
          } else {
            unresolved.push(index);
          }
        }
        if (Object.keys(resolved).length > 0) {
          setCorrections((prev) => ({ ...prev, ...resolved }));
          showSuccess(`${Object.keys(resolved).length} código(s) reconhecido(s) com sucesso!`);
        }
        setReanalysisResult({ done: true, resolved, unresolved });
        if (onProcedimentosUpdated) onProcedimentosUpdated(revisaoData);
      } else {
        setReanalysisResult({
          done: true, resolved: {}, unresolved: inconsistentes.map(({ index }) => index),
          message: "Nenhum procedimento identificado nas imagens.",
        });
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro ao re-analisar.");
      setReanalysisResult({
        done: true, resolved: {}, unresolved: inconsistentes.map(({ index }) => index),
        message: err instanceof Error ? err.message : "Erro desconhecido.",
      });
    } finally {
      setReanalyzing(false);
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
          .from("cbhpm_cirurgias").select("codigo, descricao, porte")
          .like("codigo", `${query.trim()}%`).limit(10);
        if (!error && data) results = data as CbhpmSearchResult[];
      } else {
        const { data, error } = await supabase
          .from("cbhpm_cirurgias").select("codigo, descricao, porte")
          .ilike("descricao", `%${query.trim()}%`).limit(10);
        if (!error && data) results = data as CbhpmSearchResult[];
      }
      setSearchResults((prev) => ({ ...prev, [index]: results }));
    } catch { /* ignore */ } finally {
      setSearching((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleSelectResult = (index: number, result: CbhpmSearchResult) => {
    setCorrections((prev) => ({
      ...prev,
      [index]: { codigo: result.codigo, descricao: result.descricao, quantidade: prev[index]?.quantidade ?? 1 },
    }));
    setSearchResults((prev) => ({ ...prev, [index]: [] }));
    setSearchQuery((prev) => ({ ...prev, [index]: "" }));
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // Get faturamento_id and medico_id for inserting new items
      let fatId = faturamentoId;
      let medicoId: string | null = null;

      // Try to get medico_id from an existing item or from the faturamento
      const existingItem = procedimentos.find((p) => p.item_faturamento_id);
      if (existingItem?.item_faturamento_id) {
        const { data: itemData } = await supabase
          .from("itens_faturamento")
          .select("faturamento_id, medico_id")
          .eq("id", existingItem.item_faturamento_id)
          .single();
        if (itemData) {
          fatId = fatId || itemData.faturamento_id;
          medicoId = itemData.medico_id;
        }
      }

      // Fallback: get medico_id from faturamento
      if (!medicoId && fatId) {
        const { data: fatData } = await supabase
          .from("faturamentos")
          .select("medico_id")
          .eq("id", fatId)
          .single();
        if (fatData) medicoId = fatData.medico_id;
      }

      console.log("[ProcedureReview] handleConfirm — editMode:", editMode);
      console.log("[ProcedureReview] procedimentos:", procedimentos.map((p, i) => ({
        i,
        item_id: p.item_faturamento_id,
        codigo_original: p.codigo_original,
        necessita_revisao: p.necessita_revisao,
        correction: corrections[i],
      })));

      for (let i = 0; i < procedimentos.length; i++) {
        const proc = procedimentos[i];
        const correction = corrections[i];
        // Em editMode, salvar todos que têm correção; caso contrário, só os que necessitam revisão
        if (!correction) {
          console.log(`[ProcedureReview] item ${i} — sem correction, pulando`);
          continue;
        }
        if (!editMode && !proc.necessita_revisao) {
          console.log(`[ProcedureReview] item ${i} — não necessita revisão e não é editMode, pulando`);
          continue;
        }

        const qty = correction.quantidade ?? 1;
        console.log(`[ProcedureReview] item ${i} — salvando: item_id=${proc.item_faturamento_id} codigo=${correction.codigo} descricao=${correction.descricao}`);

        if (proc.item_faturamento_id) {
          const { error, data } = await supabase
            .from("itens_faturamento")
            .update({
              codigo_procedimento: correction.codigo,
              descricao_procedimento: correction.descricao,
              quantidade: qty,
              quantidade_autorizada: qty,
              quantidade_executada: qty,
              updated_at: new Date().toISOString(),
            })
            .eq("id", proc.item_faturamento_id)
            .select();
          if (error) {
            console.error(`[ProcedureReview] ERRO ao atualizar item ${i}:`, error);
            showError(`Erro ao atualizar ${correction.codigo}: ${error.message}`);
          } else {
            console.log(`[ProcedureReview] item ${i} atualizado com sucesso:`, data);
          }
        } else if (correction.codigo && fatId) {
          const { error, data } = await supabase.from("itens_faturamento").insert({
            faturamento_id: fatId,
            medico_id: medicoId,
            codigo_procedimento: correction.codigo,
            descricao_procedimento: correction.descricao,
            quantidade_autorizada: qty,
            quantidade_executada: qty,
            quantidade: qty,
            status_item: "pendente",
          }).select();
          if (error) {
            console.error(`[ProcedureReview] ERRO ao inserir item ${i}:`, error);
          } else {
            console.log(`[ProcedureReview] item ${i} inserido com sucesso:`, data);
          }
        }
      }
      showSuccess("Procedimentos revisados com sucesso!");
      onConfirm();
    } catch (err) {
      console.error("[ProcedureReview] ERRO geral:", err);
      showError("Erro ao salvar as correções dos procedimentos.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-3">
      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl border border-[#D4A017]/20 bg-[#0f0f0f] shadow-[0_0_60px_rgba(212,160,23,0.15)]">

        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-[#D4A017]/15 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${editMode ? "bg-[#D4A017]/15 text-[#D4A017] border-[#D4A017]/20" : "bg-amber-500/15 text-amber-400 border-amber-500/20"}`}>
                {editMode ? <Keyboard className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#F5F5F5] leading-tight">
                  {editMode ? "Editar Procedimentos" : "Revisão de Procedimentos"}
                </h2>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                  {editMode
                    ? `${totalProcedimentos} procedimento(s) — edite os códigos conforme necessário`
                    : `${qtdInconsistentes} de ${totalProcedimentos} procedimento(s) precisam de confirmação`}
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

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {/* ── Global mode selector ── */}
          {globalMode === null && (
            <div className="space-y-2">
              <p className="text-[10px] text-[#9CA3AF] leading-relaxed">
                Os itens em <span className="text-amber-400 font-semibold">amarelo</span> podem ter código incorreto.
                Como deseja corrigir?
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setGlobalMode("manual")}
                  className="flex flex-col items-center gap-2 rounded-xl border border-[#D4A017]/40 bg-[#D4A017]/8 hover:bg-[#D4A017]/15 hover:border-[#D4A017]/60 transition-colors px-3 py-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D4A017]/15 border border-[#D4A017]/30">
                    <Keyboard className="h-5 w-5 text-[#D4A017]" />
                  </div>
                  <span className="text-xs font-semibold text-[#F5F5F5] text-center leading-tight">
                    Digite os códigos<br />manualmente
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setGlobalMode("camera"); void startCamera(); }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-[#60A5FA]/40 bg-[#60A5FA]/8 hover:bg-[#60A5FA]/15 hover:border-[#60A5FA]/60 transition-colors px-3 py-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#60A5FA]/15 border border-[#60A5FA]/30">
                    <Camera className="h-5 w-5 text-[#60A5FA]" />
                  </div>
                  <span className="text-xs font-semibold text-[#F5F5F5] text-center leading-tight">
                    Envie nova foto<br />dos itens
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── Mode indicator ── */}
          {globalMode !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {globalMode === "manual"
                  ? <Keyboard className="h-3.5 w-3.5 text-[#D4A017]" />
                  : <Camera className="h-3.5 w-3.5 text-[#60A5FA]" />}
                <span className="text-[10px] font-semibold text-[#9CA3AF]">
                  {globalMode === "manual" ? "Modo: digitação manual" : "Modo: nova foto"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { stopCamera(); setGlobalMode(null); setCapturedPhotos([]); setReanalysisResult(null); }}
                className="text-[10px] text-[#9CA3AF] hover:text-[#F5F5F5] underline"
              >
                Alterar
              </button>
            </div>
          )}

          {/* ── Consistent items (on top) ── */}
          {consistentes.length > 0 && (
            <div className="space-y-1.5">
              {consistentes.map(({ proc, index }) => (
                <div key={index} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
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
              ))}
            </div>
          )}

          {/* ── Separator ── */}
          {consistentes.length > 0 && inconsistentes.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-amber-500/20" />
              <span className="text-[9px] text-amber-400/70 uppercase tracking-wider font-semibold">
                {qtdInconsistentes} para revisar
              </span>
              <div className="flex-1 h-px bg-amber-500/20" />
            </div>
          )}

          {/* ── Inconsistent items ── */}
          <div className="space-y-2">
            {inconsistentes.map(({ proc, index }) => {
              const correction = corrections[index];
              const isResolved = !!correction;

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
                    {isResolved
                      ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      : <AlertTriangle className="h-3 w-3 text-amber-400" />}
                    <span className={`text-[9px] font-semibold uppercase tracking-wider ${isResolved ? "text-emerald-400" : "text-amber-400"}`}>
                      {isResolved ? (editMode ? "Código selecionado" : "Sugestão CBHPM") : "Verificar código"}
                    </span>
                  </div>

                  {/* Original data */}
                  <div className="flex items-start gap-1.5 mb-2">
                    <span className="inline-block rounded bg-[#D4A017]/15 px-1.5 py-0.5 text-[10px] font-mono text-[#D4A017] border border-[#D4A017]/25 flex-shrink-0">
                      {proc.codigo_validado || proc.codigo_original || "???"}
                    </span>
                    <p className="text-[10px] text-[#F5F5F5] leading-snug uppercase">
                      {proc.descricao_original || "Sem descrição"}
                    </p>
                  </div>

                  {/* ── Resolved: show code + quantity ── */}
                  {isResolved && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/20 mr-1.5">
                            {correction.codigo}
                          </span>
                          <span className="text-[10px] text-emerald-200">
                            {correction.descricao.length > 55
                              ? correction.descricao.slice(0, 55) + "…"
                              : correction.descricao}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCorrections((prev) => { const n = { ...prev }; delete n[index]; return n; })}
                          className="text-[9px] text-[#9CA3AF] hover:text-[#F5F5F5] underline flex-shrink-0"
                        >
                          Alterar
                        </button>
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center gap-2 rounded-md bg-black/40 border border-[#D4A017]/20 px-2.5 py-1.5">
                        <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">Quantidade:</span>
                        <Input
                          type="number"
                          min={1}
                          value={correction.quantidade}
                          onChange={(e) => {
                            const qty = Math.max(1, parseInt(e.target.value) || 1);
                            setCorrections((prev) => ({ ...prev, [index]: { ...prev[index], quantidade: qty } }));
                          }}
                          className="h-6 w-20 rounded border-[#D4A017]/20 bg-black/60 text-[10px] text-[#F5F5F5] text-center focus:border-[#D4A017]/50 px-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* ── Manual mode: search ── */}
                  {!isResolved && globalMode === "manual" && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="Código ou descrição CBHPM..."
                          value={searchQuery[index] || ""}
                          onChange={(e) => setSearchQuery((prev) => ({ ...prev, [index]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") void handleSearchCbhpm(index, searchQuery[index] || ""); }}
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

                  {/* ── Camera mode: not recognized ── */}
                  {!isResolved && globalMode === "camera" && reanalysisResult?.done && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-[10px] text-red-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                      Não reconhecido na foto — tente digitar manualmente.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Camera viewfinder + photos ── */}
          {globalMode === "camera" && (
            <div className="space-y-2">
              {cameraActive && (
                <div className="relative rounded-xl overflow-hidden border border-[#60A5FA]/30 bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-52 object-cover" />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#60A5FA]/70 rounded-tl" />
                    <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#60A5FA]/70 rounded-tr" />
                    <div className="absolute bottom-10 left-2 w-6 h-6 border-b-2 border-l-2 border-[#60A5FA]/70 rounded-bl" />
                    <div className="absolute bottom-10 right-2 w-6 h-6 border-b-2 border-r-2 border-[#60A5FA]/70 rounded-br" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
                    <button type="button" onClick={capturePhoto} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-100">
                      <Camera className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={stopCamera} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-[#9CA3AF] border border-white/20 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {capturedPhotos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[#9CA3AF]">{capturedPhotos.length} foto(s) capturada(s)</p>
                    <button type="button" onClick={() => void startCamera()} className="flex items-center gap-1 text-[10px] text-[#60A5FA] hover:text-[#93C5FD]">
                      <Camera className="h-3 w-3" /> Adicionar foto
                    </button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {capturedPhotos.map((photo, pi) => (
                      <div key={pi} className="relative">
                        <img src={photo} alt={`Foto ${pi + 1}`} className="h-16 w-24 object-cover rounded-lg border border-[#60A5FA]/30" />
                        <button type="button" onClick={() => removePhoto(pi)} className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[#9CA3AF] border border-white/20 hover:text-white">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {reanalysisResult?.done && (
                    <div className={`rounded-md border px-2.5 py-2 text-[10px] ${
                      Object.keys(reanalysisResult.resolved).length > 0
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/30 bg-red-500/10 text-red-300"
                    }`}>
                      {Object.keys(reanalysisResult.resolved).length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                          {Object.keys(reanalysisResult.resolved).length} código(s) reconhecido(s).
                          {reanalysisResult.unresolved.length > 0 && (
                            <span className="text-amber-300 ml-1">{reanalysisResult.unresolved.length} ainda pendente(s).</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          {reanalysisResult.message ?? "Nenhum código reconhecido."}
                        </div>
                      )}
                    </div>
                  )}

                  {!reanalysisResult && (
                    <Button
                      type="button"
                      className="w-full h-9 rounded-lg bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/30 hover:bg-[#60A5FA]/30 text-xs font-semibold"
                      onClick={() => void handleReanalyze()}
                      disabled={reanalyzing}
                    >
                      {reanalyzing ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Analisando imagens...</>
                      ) : (
                        <><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Analisar fotos</>
                      )}
                    </Button>
                  )}

                  {reanalysisResult?.done && reanalysisResult.unresolved.length > 0 && (
                    <button type="button" onClick={() => setGlobalMode("manual")} className="flex items-center gap-1 text-[10px] text-[#D4A017] hover:text-[#FFD700]">
                      <Keyboard className="h-3 w-3" /> Digitar os restantes manualmente
                    </button>
                  )}
                </div>
              )}

              {!cameraActive && capturedPhotos.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border border-[#60A5FA]/20 bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-[#60A5FA]" />
                  <p className="text-[10px] text-[#9CA3AF]">Abrindo câmera...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
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
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Salvando...</>
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