import { Loader2 } from "lucide-react";

/**
 * Tela de carregamento em tela cheia exibida enquanto os dados da guia
 * são buscados. Markup preservado a partir das páginas.
 */
export default function FormLoadingScreen({
  message = "Carregando dados da guia...",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {message}
    </div>
  );
}
