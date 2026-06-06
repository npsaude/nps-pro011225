/**
 * Tokens de cor por formulário ("accent"). É o único knob de cor que muda
 * entre GuiaSolicitacao (blue), GuiaAutorizacao (violet) e GuiaHonorarios
 * (emerald). As classes abaixo foram extraídas verbatim das páginas para
 * preservar exatamente a aparência atual.
 */
export type FormAccent = "blue" | "violet" | "emerald" | "teal";

export interface AccentTokens {
  /** Badge do ícone no header da página (ex.: bg-blue-100 text-blue-700) */
  titleBadge: string;
  /** Classes de foco do input/textarea */
  inputFocus: string;
  /** Botão "Salvar" */
  submitButton: string;
  /** Badge do ícone no cabeçalho do painel de Documentos */
  docPanelBadge: string;
  /** Cor do ícone de imagem nos cards de documentos */
  docIcon: string;
  /** Hover do link "abrir em nova aba" nos cards de documentos */
  docHover: string;
}

const ACCENTS: Record<FormAccent, AccentTokens> = {
  blue: {
    titleBadge: "bg-blue-100 text-blue-700",
    inputFocus: "focus:border-blue-500 focus:ring-blue-500",
    submitButton: "bg-blue-600 hover:bg-blue-700",
    docPanelBadge: "bg-blue-600",
    docIcon: "text-blue-400",
    docHover: "hover:bg-blue-50 hover:text-blue-600",
  },
  violet: {
    titleBadge: "bg-violet-100 text-violet-700",
    inputFocus: "focus:border-violet-500 focus:ring-violet-500",
    submitButton: "bg-violet-600 hover:bg-violet-700",
    docPanelBadge: "bg-violet-600",
    docIcon: "text-violet-400",
    docHover: "hover:bg-violet-50 hover:text-violet-600",
  },
  emerald: {
    titleBadge: "bg-emerald-100 text-emerald-700",
    inputFocus: "focus:border-emerald-500 focus:ring-emerald-500",
    submitButton: "bg-emerald-600 hover:bg-emerald-700",
    docPanelBadge: "bg-emerald-600",
    docIcon: "text-emerald-400",
    docHover: "hover:bg-emerald-50 hover:text-emerald-600",
  },
  teal: {
    titleBadge: "bg-teal-100 text-teal-700",
    inputFocus: "focus:border-teal-500 focus:ring-teal-500",
    submitButton: "bg-teal-600 hover:bg-teal-700",
    docPanelBadge: "bg-teal-600",
    docIcon: "text-teal-400",
    docHover: "hover:bg-teal-50 hover:text-teal-600",
  },
};

export function accentTokens(accent: FormAccent): AccentTokens {
  return ACCENTS[accent];
}
