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
    asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
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

export async function salvarTokenOpenAI(
  token: string,
): Promise<DbAppSettings> {
  // Primeiro tenta carregar o registro existente
  const existente = await carregarAppSettings();

  if (existente) {
    const { data, error } = await supabase
      .from("app_settings")
      .update({
        // usar nome da coluna exatamente como está no banco
        openai_api_token: token,
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
      asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
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
      // idem aqui: usar o nome da coluna do banco
      openai_api_token: token,
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
    asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
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

export async function salvarTokenAsaas(
  token: string,
): Promise<DbAppSettings> {
  const existente = await carregarAppSettings();

  if (existente) {
    const { data, error } = await supabase
      .from("app_settings")
      .update({
        asaas_token: token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existente.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        error.message || "Não foi possível salvar o Token da Asaas.",
      );
    }

    const mapped: DbAppSettings = {
      id: (data as any).id,
      openaiApiToken:
        (data as any).openaiApiToken ?? (data as any).openai_api_token ?? null,
      asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
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

  const { data, error } = await supabase
    .from("app_settings")
    .insert({
      asaas_token: token,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message || "Não foi possível criar as configurações com Token Asaas.",
    );
  }

  const mapped: DbAppSettings = {
    id: (data as any).id,
    openaiApiToken:
      (data as any).openaiApiToken ?? (data as any).openai_api_token ?? null,
    asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
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