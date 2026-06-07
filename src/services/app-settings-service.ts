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
    openaiModel:
      (data as any).openaiModel ?? (data as any).openai_model ?? "gpt-4",
    asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
    videoYoutube:
      (data as any).videoYoutube ?? (data as any).video_youtube ?? null,
    validarNomeMedico:
      (data as any).validarNomeMedico ??
      (data as any).validar_nome_medico ??
      true,
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
      openaiModel:
        (data as any).openaiModel ?? (data as any).openai_model ?? "gpt-4",
      asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
      videoYoutube:
        (data as any).videoYoutube ?? (data as any).video_youtube ?? null,
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
    openaiModel:
      (data as any).openaiModel ?? (data as any).openai_model ?? "gpt-4",
    asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
    videoYoutube:
      (data as any).videoYoutube ?? (data as any).video_youtube ?? null,
    validarNomeMedico:
      (data as any).validarNomeMedico ??
      (data as any).validar_nome_medico ??
      true,
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

    const mapped: DbAppSettings = {
      id: (data as any).id,
      openaiApiToken:
        (data as any).openaiApiToken ?? (data as any).openai_api_token ?? null,
      openaiModel:
        (data as any).openaiModel ?? (data as any).openai_model ?? "gpt-4",
      asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
      videoYoutube:
        (data as any).videoYoutube ?? (data as any).video_youtube ?? null,
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

  const mapped: DbAppSettings = {
    id: (data as any).id,
    openaiApiToken:
      (data as any).openaiApiToken ?? (data as any).openai_api_token ?? null,
    openaiModel:
      (data as any).openaiModel ?? (data as any).openai_model ?? "gpt-4",
    asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
    videoYoutube:
      (data as any).videoYoutube ?? (data as any).video_youtube ?? null,
    validarNomeMedico:
      (data as any).validarNomeMedico ??
      (data as any).validar_nome_medico ??
      true,
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
      openaiModel:
        (data as any).openaiModel ?? (data as any).openai_model ?? "gpt-4",
      asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
      videoYoutube:
        (data as any).videoYoutube ?? (data as any).video_youtube ?? null,
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
    openaiModel:
      (data as any).openaiModel ?? (data as any).openai_model ?? "gpt-4",
    asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
    videoYoutube:
      (data as any).videoYoutube ?? (data as any).video_youtube ?? null,
    validarNomeMedico:
      (data as any).validarNomeMedico ??
      (data as any).validar_nome_medico ??
      true,
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

export async function salvarValidarNomeMedico(
  validar: boolean,
): Promise<DbAppSettings> {
  const existente = await carregarAppSettings();

  if (existente) {
    const { error } = await supabase
      .from("app_settings")
      .update({
        validar_nome_medico: validar,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existente.id);

    if (error) {
      throw new Error(
        error.message ||
          "Não foi possível salvar a configuração de validação do nome do médico.",
      );
    }

    return { ...existente, validarNomeMedico: validar };
  }

  const { data, error } = await supabase
    .from("app_settings")
    .insert({
      validar_nome_medico: validar,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível criar o registro de configurações com a validação do nome do médico.",
    );
  }

  return {
    id: (data as any).id,
    openaiApiToken:
      (data as any).openaiApiToken ?? (data as any).openai_api_token ?? null,
    openaiModel:
      (data as any).openaiModel ?? (data as any).openai_model ?? "gpt-4",
    asaasToken: (data as any).asaasToken ?? (data as any).asaas_token ?? null,
    videoYoutube:
      (data as any).videoYoutube ?? (data as any).video_youtube ?? null,
    validarNomeMedico:
      (data as any).validarNomeMedico ??
      (data as any).validar_nome_medico ??
      true,
    createdAt:
      (data as any).createdAt ??
      (data as any).created_at ??
      new Date().toISOString(),
    updatedAt:
      (data as any).updatedAt ??
      (data as any).updated_at ??
      new Date().toISOString(),
  };
}