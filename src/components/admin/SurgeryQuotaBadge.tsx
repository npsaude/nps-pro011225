import { Coins } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCreditBalance } from "@/hooks/use-credit-balance";

/**
 * Badge de créditos do pacote contratado, exibido no header para médicos.
 * Mostra os créditos restantes no período da assinatura.
 */
export default function SurgeryQuotaBadge() {
  const balance = useCreditBalance();

  // Placeholder com mesmas dimensões enquanto carrega pela 1ª vez
  // — assim o header não "salta" ao montar a tela.
  if (balance.loading) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-400 ring-1 ring-slate-200">
        <Coins className="h-3.5 w-3.5 opacity-60" />
        <span className="inline-block h-3 w-8 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  // Sem limite definido no plano: não exibe a badge.
  if (balance.total === null || balance.remaining === null) return null;

  const remaining = Math.max(0, balance.remaining);

  const colorClasses = balance.isOver
    ? "bg-rose-50 text-rose-600 ring-rose-200"
    : balance.isNear
      ? "bg-amber-50 text-amber-600 ring-amber-200"
      : "bg-emerald-50 text-emerald-600 ring-emerald-200";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ring-1 transition ${colorClasses}`}
        >
          <Coins className="h-3.5 w-3.5" />
          <span>
            {remaining}/{balance.total}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p className="font-medium">Créditos do plano</p>
        <p className="text-slate-400">
          {remaining} de {balance.total} créditos restantes no período
        </p>
        <p className="mt-1 text-slate-400">
          Faturamento = 10 · Acompanhamento = 2 créditos
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
