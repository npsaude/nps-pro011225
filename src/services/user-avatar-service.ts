import { supabase } from "@/integrations/supabase/client";

const AVATAR_BUCKET = "NPS-pro";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function uploadUserAvatar(params: { userId: string; blob: Blob }): Promise<string> {
  const { userId, blob } = params;

  const path = `avatars/${userId}/avatar.jpg`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: "image/jpeg",
    cacheControl: "3600",
  });

  if (error) throw error;

  return path;
}

export async function saveUserAvatarPath(params: {
  userId: string;
  path: string;
}): Promise<void> {
  const { userId, path } = params;

  const { error } = await supabase.from("user_avatars").upsert(
    {
      user_id: userId,
      avatar_path: path,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

export async function createAvatarSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  const signedUrl = data?.signedUrl ?? null;
  if (!signedUrl) throw new Error("Não foi possível obter a URL da imagem.");

  return signedUrl;
}

export async function setUserAvatar(params: {
  userId: string;
  blob: Blob;
}): Promise<{ path: string; signedUrl: string }> {
  const { userId, blob } = params;

  const path = await uploadUserAvatar({ userId, blob });
  await saveUserAvatarPath({ userId, path });
  const signedUrl = await createAvatarSignedUrl(path);

  return { path, signedUrl };
}

export async function getUserAvatarPath(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_avatars")
    .select("avatar_path")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return (data as any)?.avatar_path ?? null;
}