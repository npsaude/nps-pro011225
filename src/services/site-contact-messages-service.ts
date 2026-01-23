import { supabase } from "@/integrations/supabase/client";

export type SiteContactMessage = {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  city: string;
  uf: string;
  message: string;
  created_at: string;
  metadata: unknown | null;
};

export async function listarSiteContactMessages(): Promise<SiteContactMessage[]> {
  const { data, error } = await supabase
    .from("site_contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as SiteContactMessage[];
}

export async function excluirSiteContactMessage(id: string): Promise<void> {
  const { error } = await supabase.from("site_contact_messages").delete().eq("id", id);
  if (error) throw error;
}