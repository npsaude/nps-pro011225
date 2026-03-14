import { CheckCircle2, AlertCircle, XCircle, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckResult } from "@/utils/consistencyCheck";

interface Props {
  results: CheckResult[];
  onContinue: () => void;
  onVoltar: () => void;
}

// Campos fixos na ordem da tabela
const CAMPOS = [
  { label: "Nome do paciente",          ids: ["S1","A1","C1"] },
  { label: "Hora de início",            ids: ["S2","A2","C2"] },
  { label: "Cirurgião nome",            ids: ["S3","A3","M1"] },
  { label: "Cirurgião CRM",             ids: ["S4","A4","M2"] },
  { label: "Código dos procedimentos",  ids: ["S5","A5","P1"] },
  { label: "Quantidade de procedimentos", ids: ["S6","A6","P2"] },
] as const;

// Mapeamento de documento para coluna
const DOC_COL: Record<string, "sol" | "aut" | "desc"> = {
  guia_solicitacao:   "sol",
  guia_autorizacao:   "aut",
  descricao_cirurgica: "desc",
};

type ColKey = "sol" | "aut" | "desc";

interface CellData {
  value?: string;
  status: CheckResult["status"];
  detail?: string;
}

function buildRow(results: CheckResult[], ids: readonly string[]): Record<ColKey, CellData | null> {
  const row: Record<ColKey, CellData | null> = { sol: null, aut: null, desc: null };

  for (const id of ids) {
    const r = results.find(x => x.id === id);
    if (!r) continue;

    // Coluna A
    if (r.documentoA) {
      const col = DOC_COL[r.documentoA];
      if (col) {
        row[col] = { value: r.valorA, status: r.status, detail: r.detail };
      }
    }

    // Coluna B
    if (r.documentoB) {
      const col = DOC_COL[r.documentoB];
      if (col) {
        // Status da célula B: se é o documento "final" (desc), usa o status do check
        // Se é o documento de referência (A), usa "ok" se foi extraído
        row[col] = { value: r.valorB, status: r.status, detail: r.detail };
      }
    }

    // Se só tem documentoA (sem B), a célula A recebe o status do check
    if (r.documentoA && !r.documentoB) {
      const col = DOC_COL[r.documentoA];
      if (col) {
        row[col] = { value: r.valorA, status: r.status, detail: r.detail };
      }
    }
  }

  return row;
}

function StatusIcon({ status }: { status: CheckResult["status"] }) {
  if (status === "ok")      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (status === "warning") return <AlertCircle  className="h-4 w-4 text-[#D4A017] shrink-0" />;
  if (status === "error")   return <XCircle      className="h-4 w-4 text-red-500 shrink-0" />;
  return <Minus className="h-4 w-4 text-[#6B7280] shrink-0" />;
}

function CellContent({ cell }: { cell: CellData | null }) {
  if (!cell) {
    return (
      <div className="flex items-center justify-center h-full">
        <Minus className="h-3.5 w-3.5 text-[#4B5563]" />
      </div>
    );
  }

  const valueColor =
    cell.status === "ok"      ? "text-green-400" :
    cell.status === "warning" ? "text-[#D4A017]" :
    cell.status === "error"   ? "text-red-400"   :
    "text-[#6B7280]";

  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <StatusIcon status={cell.status} />
      {cell.value ? (
        <span className={`text-[10px] leading-tight text-center break-all ${valueColor}`}>
          {cell.value.length > 20 ? cell.value.slice(0, 18) + "…" : cell.value}
        </span>
      ) : (
        <span className="text-[10px] text-[#4B5563] italic">—</span>
      )}
    </div>
  );
}

export default function ConsistencyResultsTable({ results, onContinue, onVoltar }: Props) {
  const total = {
    ok:      results.filter(r => r.status === "ok").length,
    warning: results.filter(r => r.status === "warning").length,
    error:   results.filter(r => r.status === "error").length,
    skipped: results.filter(r => r.status === "skipped").length,
  };

  const hasError = total.error > 0;

  // Detectar quais colunas têm dados
  const hasSol  = results.some(r => r.documentoA === "guia_solicitacao"  || r.documentoB === "guia_solicitacao");
  const hasAut  = results.some(r => r.documentoA === "guia_autorizacao"  || r.documentoB === "guia_autorizacao");
  const hasDesc = results.some(r => r.documentoA === "descricao_cirurgica" || r.documentoB === "descricao_cirurgica");

  const cols: { key: ColKey; label: string }[] = [
    ...(hasSol  ? [{ key: "sol"  as ColKey, label: "Guia de\nSolicitação" }] : []),
    ...(hasAut  ? [{ key: "aut"  as ColKey, label: "Guia de\nAutorização" }] : []),
    ...(hasDesc ? [{ key: "desc" as ColKey, label: "Descrição\nCirúrgica" }] : []),
  ];

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
          {total.skipped > 0 && (
            <span className="text-[#6B7280]">{total.skipped} não verificado{total.skipped !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-[#D4A017]/20 bg-black/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D4A017]/20 bg-black/60">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-[#9CA3AF] w-[38%]">
                  Campo
                </th>
                {cols.map(col => (
                  <th
                    key={col.key}
                    className="px-2 py-2.5 text-center text-[10px] font-semibold text-[#D4A017] whitespace-pre-line leading-tight"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAMPOS.map((campo, idx) => {
                const row = buildRow(results, campo.ids);
                // Verificar se alguma célula tem dados
                const hasAnyData = cols.some(c => row[c.key] !== null);
                if (!hasAnyData) return null;

                // Status geral da linha (pior status)
                const cellStatuses = cols.map(c => row[c.key]?.status).filter(Boolean) as CheckResult["status"][];
                const rowStatus =
                  cellStatuses.includes("error")   ? "error"   :
                  cellStatuses.includes("warning")  ? "warning" :
                  cellStatuses.includes("skipped")  ? "skipped" :
                  cellStatuses.includes("ok")       ? "ok"      : "skipped";

                const rowBg =
                  rowStatus === "error"   ? "bg-red-950/20"    :
                  rowStatus === "warning" ? "bg-yellow-950/20" :
                  "";

                const labelColor =
                  rowStatus === "error"   ? "text-red-300"    :
                  rowStatus === "warning" ? "text-[#D4A017]"  :
                  rowStatus === "ok"      ? "text-[#F5F5F5]"  :
                  "text-[#6B7280]";

                // Detail da linha (pegar o mais relevante)
                const worstCell = cols
                  .map(c => row[c.key])
                  .filter(Boolean)
                  .find(c => c!.status === rowStatus);
                const detail = worstCell?.detail;

                return (
                  <tr
                    key={campo.label}
                    className={`border-b border-[#D4A017]/10 last:border-0 ${rowBg} ${idx % 2 === 0 ? "" : "bg-white/[0.02]"}`}
                  >
                    {/* Campo */}
                    <td className="px-3 py-2 align-top">
                      <span className={`text-[11px] font-medium leading-snug ${labelColor}`}>
                        {campo.label}
                      </span>
                      {detail && (
                        <p className="mt-0.5 text-[10px] text-[#6B7280] leading-snug">
                          {detail}
                        </p>
                      )}
                    </td>
                    {/* Células por documento */}
                    {cols.map(col => (
                      <td key={col.key} className="px-2 py-1 align-middle text-center border-l border-[#D4A017]/10">
                        <CellContent cell={row[col.key]} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 px-1 text-[10px] text-[#6B7280]">
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Correto</span>
        <span className="flex items-center gap-1"><AlertCircle  className="h-3 w-3 text-[#D4A017]" /> Suspeita</span>
        <span className="flex items-center gap-1"><XCircle      className="h-3 w-3 text-red-500"   /> Inconsistente</span>
        <span className="flex items-center gap-1"><Minus        className="h-3 w-3 text-[#6B7280]" /> Não verificado</span>
      </div>

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
