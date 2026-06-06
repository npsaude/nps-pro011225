import { accentTokens, type FormAccent } from "./accent";

/**
 * Classes-base de input/textarea (sem as classes de foco que dependem do
 * accent). Extraídas verbatim do `inputCls` duplicado nas páginas, para
 * serem reutilizadas tanto pelo TextField quanto pelos blocos irregulares
 * (grupos repetidos) que ficam como escape hatch nas páginas.
 */
export const INPUT_BASE =
  "h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-1 w-full";

export const TEXTAREA_BASE =
  "resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-1";

/** Classe completa do input para um dado accent. */
export function inputClass(accent: FormAccent): string {
  return `${INPUT_BASE} ${accentTokens(accent).inputFocus}`;
}
