import { supabase } from "@/integrations/supabase/client";
import type { DbAppSettings } from "@/db/schema";

export async function carregarAppSettings(): Promise<DbAppSettings | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível carregar as configurações da aplicação.",
    );
  }

  // Adapta nomes de colunas caso estejam em snake_case no banco
  if (!data) return null;

  const mapped: DbAppSettings = {
    id: (data as any).id,
    openaiApiToken:
      (data as any).openaiApiToken ?? (data as any).openai_api_token ?? null,
    createdAt:
      (data as any).createdAt ?? (data as any).created_at ?? new Date().toISOString(),
    updatedAt:
      (data as any).updatedAt ?? (data as any).updated_at ?? new Date().toISOString(),
  };

  return mapped;
}

export async function salvarTokenOpenAI(
  token: string,
): Promise<DbAppSettings> {
  // Primeiro tenta carregar o registro existente
  const existente = await carregarAppSettings();

  if (existente) {
    const { data, error } = await supabase
      .from("app_settings")
      .update({
        openaiApiToken: token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existente.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        error.message ||
          "Não foi possível salvar o Token OpenAI nas configurações.",
      );
    }

    const mapped: DbAppSettings = {
      id: (data as any).id,
      openaiApiToken:
        (data as any).openaiApiToken ?? (data as any).openai_api_token ?? null,
      createdAt:
        (data as any).createdAt ??
        (data as any).created_at ??
        new Date().toISOString(),
      updatedAt:
        (data as any).updatedAt ??
        (data as any).updated_at ??
        new Date().toISOString(),
    };

    return mapped;
  }

  // Se não existir, cria um novo registro
  const { data, error } = await supabase
    .from("app_settings")
    .insert({
      openaiApiToken: token,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível criar o registro de configurações com o Token OpenAI.",
    );
  }

  const mapped: DbAppSettings = {
    id: (data as any).id,
    openaiApiToken:
      (data as any).openaiApiToken ?? (data as any).openai_api_token ?? null,
    createdAt:
      (data as any).createdAt ??
      (data as any).created_at ??
      new Date().toISOString(),
    updatedAt:
      (data as any).updatedAt ??
      (data as any).updated_at ??
      new Date().toISOString(),
  };

  return mapped;
}