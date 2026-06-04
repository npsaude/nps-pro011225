/**
 * Configuração central do Supabase para uso fora do client gerado.
 * Evita URLs hardcoded espalhadas pelo código.
 */
export const SUPABASE_URL = "https://pokyribuibmbeorrcsgk.supabase.co";

/** Monta a URL pública de uma edge function pelo nome. */
export const edgeFunctionUrl = (name: string): string =>
  `${SUPABASE_URL}/functions/v1/${name}`;
