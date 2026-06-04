import { supabase } from "@/integrations/supabase/client";

export type PurgeUserResult = {
  status: "ok";
  email: string;
  user_id: string;
  deletedStorageObjects: number;
  db: unknown;
};

export async function purgeUserByEmail(email: string): Promise<PurgeUserResult> {
  const normalized = email.trim().toLowerCase();

  const { data, error } = await supabase.functions.invoke("purge-user", {
    body: { email: normalized },
  });

  if (error) {
    const invokeErr = error as {
      context?: { response?: { status?: number }; status?: number };
      status?: number;
    };
    const status =
      invokeErr?.context?.response?.status ??
      invokeErr?.status ??
      invokeErr?.context?.status ??
      undefined;

    if (status === 404) {
      throw new Error("Usuário não encontrado (provavelmente já foi excluído). ");
    }

    throw new Error(error.message || "Não foi possível excluir o usuário.");
  }

  const result = data as PurgeUserResult & { error?: string };
  if (result?.error) {
    throw new Error(result.error);
  }

  return result;
}