import { supabase } from "@/integrations/supabase/client";
import type { DbSystemUser } from "@/db/schema";

export type SystemUserProfileUpdate = Partial<
  Pick<DbSystemUser, "nome" | "celular">
> & {
  avatar_url?: string | null;
};

export async function carregarMeuUsuarioSistema(): Promise<DbSystemUser | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const uid = authData.user?.id ?? null;
  const email = authData.user?.email?.trim() ?? null;

  if (!uid && !email) return null;

  if (uid) {
    const { data, error } = await supabase
      .from("usuarios_sistema")
      .select("*")
      .eq("id_user", uid)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as DbSystemUser;
  }

  if (email) {
    const { data, error } = await supabase
      .from("usuarios_sistema")
      .select("*")
      .ilike("email", email)
      .maybeSingle();

    if (error) throw error;
    return (data as DbSystemUser | null) ?? null;
  }

  return null;
}

export async function atualizarMeuUsuarioSistema(
  updates: SystemUserProfileUpdate,
): Promise<DbSystemUser> {
  const current = await carregarMeuUsuarioSistema();
  if (!current) throw new Error("Usuário do sistema não encontrado.");

  const payload: Record<string, unknown> = {};
  if (typeof updates.nome === "string") payload.nome = updates.nome;
  if (typeof updates.celular !== "undefined") payload.celular = updates.celular;
  if (typeof updates.avatar_url !== "undefined") payload.avatar_url = updates.avatar_url;

  const { data, error } = await supabase
    .from("usuarios_sistema")
    .update(payload)
    .eq("id_user", current.id_user)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Não foi possível atualizar o perfil.");

  return data as DbSystemUser;
}

export async function uploadAvatar(params: {
  file: File;
  userId: string;
}): Promise<string> {
  const { file, userId } = params;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `avatars/${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("NPS-pro")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) throw uploadError;

  return path;
}