import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  X,
  Loader2,
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
  onConfirm: () => void;
  onClose: () => void;
}

interface CbhpmSearchResult {
  codigo: string;
  descricao: string;
  porte: string | null;
}

const ProcedureReviewDialog: React.FC<ProcedureReviewDialogProps> = ({
  open,
  procedimentos,
  onConfirm,
  onClose,
}) => {
  // Corrections keyed by the index in the FULL procedimentos array
  const [corrections, setCorrections] = useState<
    Record<number, { codigo: string; descricao: string }>
  >({});
  const [searchQuery, setSearchQuery] = useState<Record<number, string>>({});
  const [searchResults, setSearchResults] = useState<
    Record<number, CbhpmSearchResult[]>
  >({});
  const [searching, setSearching] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [expandedSearch, setExpandedSearch] = useState<number | null>(null);

  if (!open) return null;

  const totalProcedimentos = procedimentos.length;
  const qtdInconsistentes = procedimentos.filter((p) => p.necessita_revisao).length;

  if (totalProcedimentos === 0) {
    onConfirm();
    return null;
  }

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
    setExpandedSearch(null);
    setSearchResults((prev) => ({ ...prev, [index]: [] }));
    setSearchQuery((prev) => ({ ...prev, [index]: "" }));
  };

  const handleConfirm = async () => {
    setSaving(true);

    try {
      for (let i = 0; i < procedimentos.length; i++) {
        const proc = procedimentos[i];
        const correction = corrections[i];

        // Only process procedures that need review AND have a correction
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

          if (error) {
            console.error("Erro ao atualizar procedimento:", error);
            showError(
              `Erro ao atualizar procedimento ${correction.codigo}: ${error.message}`
            );
          }
        } else if (correction.codigo) {
          // Rejected procedure — insert new
          const faturamentoItem = procedimentos.find(
            (p) => p.item_faturamento_id
          );
          if (faturamentoItem?.item_faturamento_id) {
            const { data: itemData } = await supabase
              .from("itens_faturamento")
              .select("faturamento_id, medico_id")
              .eq("id", faturamentoItem.item_faturamento_id)
              .single();

            if (itemData) {
              const { error } = await supabase
                .from("itens_faturamento")
                .insert({
                  faturamento_id: itemData.faturamento_id,
                  medico_id: itemData.medico_id,
                  codigo_procedimento: correction.codigo,
                  descricao_procedimento: correction.descricao,
                  quantidade_autorizada: 1,
                  quantidade_executada: 1,
                  quantidade: 1,
                  status_item: "pendente",
                });

              if (error) {
                console.error("Erro ao inserir procedimento corrigido:", error);
              }
            }
          }
        }
      }

      showSuccess("Procedimentos revisados com sucesso!");
      onConfirm();
    } catch (err) {
      console.error("Erro ao salvar correções:", err);
      showError("Erro ao salvar as correções dos procedimentos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-[#D4A017]/20 bg-[#0f0f0f] shadow-[0_0_60px_rgba(212,160,23,0.15)]">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-[#D4A017]/15 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#F5F5F5]">
                  Revisão de Procedimentos
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  {qtdInconsistentes} de {totalProcedimentos} procedimento(s)
                  precisam da sua confirmação
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-[#9CA3AF] border border-[#D4A017]/15 hover:border-[#D4A017]/30 hover:text-[#F5F5F5]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Confira os procedimentos extraídos. Os itens destacados em{" "}
            <span className="text-amber-400 font-semibold">amarelo</span> podem
            estar com o código incorreto — corrija-os antes de gerar a guia.
          </p>

          {procedimentos.map((proc, index) => {
            const needsReview = proc.necessita_revisao;
            const correction = corrections[index];
            const isResolved = needsReview && !!correction;
            const isSearchOpen = expandedSearch === index;

            // ── Procedure OK (no review needed) ──
            if (!needsReview) {
              return (
                <div
                  key={index}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5"
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-block rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-mono text-emerald-300 border border-emerald-500/20">
                          {proc.codigo_validado || proc.codigo_original || "—"}
                        </span>
                        <span className="text-[10px] text-emerald-400/70 uppercase font-semibold tracking-wider">
                          OK
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#E5E5E5] leading-snug">
                        {proc.descricao_validada ||
                          proc.descricao_original ||
                          "Sem descrição"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // ── Procedure needs review ──
            return (
              <div
                key={index}
                className={`rounded-xl border p-3.5 transition-colors ${
                  isResolved
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/40 bg-amber-500/[0.07]"
                }`}
              >
                {/* Header label */}
                <div className="flex items-center gap-1.5 mb-2">
                  {isResolved ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isResolved ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {isResolved ? "Corrigido" : "Verificar código"}
                  </span>
                </div>

                {/* Original extracted data */}
                <div className="mb-2.5">
                  <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">
                    Extraído da descrição cirúrgica
                  </p>
                  <div className="flex items-start gap-2">
                    <span className="inline-block rounded bg-[#D4A017]/15 px-2 py-0.5 text-xs font-mono text-[#D4A017] border border-[#D4A017]/25 flex-shrink-0">
                      {proc.codigo_original || "???"}
                    </span>
                    <p className="text-xs text-[#F5F5F5] leading-snug uppercase">
                      {proc.descricao_original || "Sem descrição"}
                    </p>
                  </div>
                </div>

                {/* Resolved state */}
                {isResolved && correction && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="inline-block rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-mono text-emerald-300 border border-emerald-500/20 mr-2">
                        {correction.codigo}
                      </span>
                      <span className="text-xs text-emerald-200">
                        {correction.descricao.length > 55
                          ? correction.descricao.slice(0, 55) + "..."
                          : correction.descricao}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCorrections((prev) => {
                          const next = { ...prev };
                          delete next[index];
                          return next;
                        });
                      }}
                      className="text-[10px] text-[#9CA3AF] hover:text-[#F5F5F5] underline flex-shrink-0"
                    >
                      Alterar
                    </button>
                  </div>
                )}

                {/* Search for correct code */}
                {!isResolved && (
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSearch(isSearchOpen ? null : index)
                      }
                      className="flex items-center gap-1.5 text-[11px] text-[#D4A017] hover:text-[#FFD700] transition-colors"
                    >
                      <Search className="h-3 w-3" />
                      {isSearchOpen
                        ? "Fechar busca"
                        : "Buscar código correto na CBHPM"}
                    </button>

                    {isSearchOpen && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Digite código ou descrição..."
                            value={searchQuery[index] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSearchQuery((prev) => ({
                                ...prev,
                                [index]: val,
                              }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                void handleSearchCbhpm(
                                  index,
                                  searchQuery[index] || ""
                                );
                              }
                            }}
                            className="h-8 rounded-lg border-[#D4A017]/20 bg-black/60 text-xs text-[#F5F5F5] placeholder:text-[#6B7280] focus:border-[#D4A017]/50"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-lg bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/30 hover:bg-[#D4A017]/30 px-3"
                            onClick={() =>
                              void handleSearchCbhpm(
                                index,
                                searchQuery[index] || ""
                              )
                            }
                            disabled={searching[index]}
                          >
                            {searching[index] ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Search className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        {/* Search results */}
                        {(searchResults[index] || []).length > 0 && (
                          <div className="max-h-40 overflow-y-auto rounded-lg border border-[#D4A017]/15 bg-black/60">
                            {searchResults[index].map((result) => (
                              <button
                                key={result.codigo}
                                type="button"
                                onClick={() =>
                                  handleSelectResult(index, result)
                                }
                                className="flex w-full items-start gap-2 border-b border-[#D4A017]/10 px-3 py-2 text-left hover:bg-[#D4A017]/10 transition-colors last:border-b-0"
                              >
                                <span className="inline-block rounded bg-[#D4A017]/15 px-1.5 py-0.5 text-[10px] font-mono text-[#D4A017] border border-[#D4A017]/20 flex-shrink-0 mt-0.5">
                                  {result.codigo}
                                </span>
                                <span className="text-[11px] text-[#F5F5F5] leading-tight">
                                  {result.descricao}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {searching[index] && (
                          <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Buscando...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-[#D4A017]/15 px-6 py-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-10 rounded-lg border-[#D4A017]/25 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10 text-xs"
            onClick={onClose}
            disabled={saving}
          >
            Pular revisão
          </Button>
          <Button
            type="button"
            className="flex-1 h-10 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] text-xs"
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
