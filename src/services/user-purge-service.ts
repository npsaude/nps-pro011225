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
    throw new Error(error.message || "Não foi possível excluir o usuário.");
  }

  if ((data as any)?.error) {
    throw new Error((data as any).error);
  }

  return data as PurgeUserResult;
}
