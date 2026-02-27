import { supabase } from "@/integrations/supabase/client";

export type EmailTemplateType = "FATURAR" | "NAO_FATURAR";

export type EmailTemplate = {
  id: string;
  tipo: EmailTemplateType;
  assunto: string;
  corpo_html: string;
  updated_at: string;
};

export async function carregarModelosEmail(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from("modelos_email_faturamento")
    .select("id, tipo, assunto, corpo_html, updated_at")
    .order("tipo", { ascending: true });

  if (error) {
    throw new Error(error.message || "Não foi possível carregar os modelos de email.");
  }

  return (data ?? []) as EmailTemplate[];
}

export async function salvarModeloEmail(params: {
  tipo: EmailTemplateType;
  assunto: string;
  corpo_html: string;
}): Promise<void> {
  const { error } = await supabase
    .from("modelos_email_faturamento")
    .upsert(
      {
        tipo: params.tipo,
        assunto: params.assunto,
        corpo_html: params.corpo_html,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tipo" },
    );

  if (error) {
    throw new Error(error.message || "Não foi possível salvar o modelo de email.");
  }
}
