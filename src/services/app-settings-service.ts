import { supabase } from "@/integrations/supabase/client";
import type { DbAppSettings } from "@/db/schema";

/**
 * Linha bruta da tabela `app_settings`. As colunas podem chegar tanto em
 * camelCase quanto em snake_case dependendo da origem, então ambas as
 * variantes são opcionais aqui e normalizadas em `mapToAppSettings`.
 */
interface AppSettingsRawRow {
  id: string;
  openaiApiToken?: string | null;
  openai_api_token?: string | null;
  openaiModel?: string | null;
  openai_model?: string | null;
  asaasToken?: string | null;
  asaas_token?: string | null;
  videoYoutube?: string | null;
  video_youtube?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
}

/** Normaliza a linha bruta (camelCase/snake_case) para o tipo da aplicação. */
function mapToAppSettings(row: AppSettingsRawRow): DbAppSettings {
  return {
    id: row.id,
    openaiApiToken: row.openaiApiToken ?? row.openai_api_token ?? null,
    openaiModel: row.openaiModel ?? row.openai_model ?? "gpt-4",
    asaasToken: row.asaasToken ?? row.asaas_token ?? null,
    videoYoutube: row.videoYoutube ?? row.video_youtube ?? null,
    createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? row.updated_at ?? new Date().toISOString(),
  };
}

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

  return mapToAppSettings(data as AppSettingsRawRow);
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

    return mapToAppSettings(data as AppSettingsRawRow);
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

  return mapToAppSettings(data as AppSettingsRawRow);
}

export async function salvarModeloOpenAI(
  modelo: string,
): Promise<DbAppSettings> {
  // Primeiro tenta carregar o registro existente
  const existente = await carregarAppSettings();

  if (existente) {
    const { data, error } = await supabase
      .from("app_settings")
      .update({
        openai_model: modelo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existente.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        error.message ||
          "Não foi possível salvar o Modelo OpenAI nas configurações.",
      );
    }

    return mapToAppSettings(data as AppSettingsRawRow);
  }

  // Se não existir, cria um novo registro
  const { data, error } = await supabase
    .from("app_settings")
    .insert({
      openai_model: modelo,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível criar o registro de configurações com o Modelo OpenAI.",
    );
  }

  return mapToAppSettings(data as AppSettingsRawRow);
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

    return mapToAppSettings(data as AppSettingsRawRow);
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

  return mapToAppSettings(data as AppSettingsRawRow);
}
