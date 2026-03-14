import { CheckCircle2, AlertCircle, XCircle, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckResult } from "@/utils/consistencyCheck";

interface Props {
  results: CheckResult[];
  onContinue: () => void;
  onVoltar: () => void;
}

export default function ConsistencyResultsTable({ results, onContinue, onVoltar }: Props) {
  const grupos = ["cirurgia", "medicos", "procedimentos"] as const;
  const grupoLabel: Record<string, string> = {
    cirurgia: "Cirurgia",
    medicos: "Médicos",
    procedimentos: "Procedimentos",
  };

  const total = {
    ok:      results.filter(r => r.status === "ok").length,
    warning: results.filter(r => r.status === "warning").length,
    error:   results.filter(r => r.status === "error").length,
    skipped: results.filter(r => r.status === "skipped").length,
  };

  const hasError = total.error > 0;

  function StatusIcon({ status }: { status: CheckResult["status"] }) {
    if (status === "ok")      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    if (status === "warning") return <AlertCircle  className="h-4 w-4 text-[#D4A017] shrink-0" />;
    if (status === "error")   return <XCircle      className="h-4 w-4 text-red-500 shrink-0" />;
    return <Minus className="h-4 w-4 text-[#6B7280] shrink-0" />;
  }

  function StatusLabel({ status }: { status: CheckResult["status"] }) {
    const map = {
      ok:      { text: "Correto",         cls: "text-green-500" },
      warning: { text: "Suspeita",        cls: "text-[#D4A017]" },
      error:   { text: "Inconsistente",   cls: "text-red-500" },
      skipped: { text: "Não verificado",  cls: "text-[#6B7280]" },
    };
    const { text, cls } = map[status];
    return <span className={`text-xs font-medium ${cls}`}>{text}</span>;
  }

  return (
    <div className="w-full max-w-md space-y-4">

      {/* Cabeçalho com resumo */}
      <div className="rounded-xl border border-[#D4A017]/20 bg-black/50 px-4 py-3">
        <p className="text-sm font-semibold text-[#F5F5F5] mb-2">
          Verificação de consistência
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-green-500">{total.ok} correto{total.ok !== 1 ? "s" : ""}</span>
          <span className="text-[#D4A017]">{total.warning} suspeita{total.warning !== 1 ? "s" : ""}</span>
          <span className="text-red-500">{total.error} inconsistente{total.error !== 1 ? "s" : ""}</span>
          <span className="text-[#6B7280]">{total.skipped} não verificado{total.skipped !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Tabela por grupo */}
      {grupos.map(grupo => {
        const itens = results.filter(r => r.grupo === grupo);
        if (itens.length === 0) return null;
        return (
          <div key={grupo} className="rounded-xl border border-[#D4A017]/20 bg-black/40 overflow-hidden">
            <div className="px-4 py-2 border-b border-[#D4A017]/10 bg-black/30">
              <span className="text-xs font-semibold text-[#D4A017] uppercase tracking-wider">
                {grupoLabel[grupo]}
              </span>
            </div>
            <div className="divide-y divide-[#D4A017]/10">
              {itens.map(item => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#F5F5F5]">{item.label}</span>
                      <StatusLabel status={item.status} />
                    </div>
                    {item.detail && (
                      <p className="mt-0.5 text-[11px] text-[#9CA3AF] leading-snug break-words">
                        {item.detail}
                      </p>
                    )}
                    {/* Valores comparados */}
                    {item.valorA && item.valorB && item.status !== "ok" && (
                      <div className="mt-1.5 flex gap-2 text-[10px] flex-wrap">
                        <span className="rounded bg-[#D4A017]/10 px-1.5 py-0.5 text-[#D4A017]">
                          {item.documentoA}: {item.valorA}
                        </span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[#9CA3AF]">
                          {item.documentoB}: {item.valorB}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Botões de ação */}
      <div className={`grid gap-3 pt-1 ${hasError ? "grid-cols-2" : "grid-cols-1"}`}>
        {hasError && (
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-lg border-[#D4A017]/40 bg-black/40 text-[#F5F5F5] hover:bg-[#D4A017]/10"
            onClick={onVoltar}
          >
            Voltar e corrigir
          </Button>
        )}
        <Button
          type="button"
          className="h-11 rounded-lg bg-gradient-to-r from-[#FFD700] via-[#D4A017] to-[#B8860B] text-black font-semibold shadow-[0_0_20px_rgba(212,160,23,0.4)] hover:shadow-[0_0_30px_rgba(212,160,23,0.6)] transition-all"
          onClick={onContinue}
        >
          {hasError ? "Continuar mesmo assim" : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
