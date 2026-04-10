import { supabase } from "@/integrations/supabase/client";

export type EmailTemplateType = "FATURAR" | "NAO_FATURAR";

export type EmailTemplate = {
  id: string;
  tipo: EmailTemplateType;
  assunto: string;
  corpo_html: string;
  created_at: string;
  updated_at: string;
};

export type EmailTemplateDraft = {
  assunto: string;
  corpo_html: string;
};

export const EMAIL_TEMPLATE_TYPES: EmailTemplateType[] = ["FATURAR", "NAO_FATURAR"];

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  FATURAR: "Email faturar",
  NAO_FATURAR: "Email não faturar",
};

export const EMAIL_TEMPLATE_DESCRIPTIONS: Record<EmailTemplateType, string> = {
  FATURAR: "Solicita o faturamento à instituição responsável.",
  NAO_FATURAR: "Informa à instituição que o caso não deve ser faturado.",
};

export const EMAIL_TEMPLATE_VARIABLES = [
  "{{contato}}",
  "{{paciente_nome}}",
  "{{convenio}}",
  "{{data_cirurgia}}",
  "{{hora_inicio}}",
  "{{hospital_nome}}",
  "{{nome_usuario}}",
] as const;

export const EMAIL_TEMPLATE_PREVIEW_VALUES: Record<string, string> = {
  contato: "Equipe de faturamento",
  paciente_nome: "Maria da Silva",
  convenio: "Unimed Premium",
  data_cirurgia: "10/04/2026",
  hora_inicio: "07:30",
  hospital_nome: "Hospital São Lucas",
  nome_usuario: "Dr. João Almeida",
};

const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplateDraft> = {
  FATURAR: {
    assunto: "[FATURAMENTO] {{nome_usuario}} - {{paciente_nome}}",
    corpo_html:
      "<p>Prezado(a) {{contato}}.</p>\n\n<p>Solicitamos faturamento do(a) paciente <strong>{{paciente_nome}}</strong>, realizado pelo convênio <strong>{{convenio}}</strong>, na data <strong>{{data_cirurgia}}</strong>, horário de início <strong>{{hora_inicio}}</strong>, que ocorreu no <strong>{{hospital_nome}}</strong>.</p>\n\n<p>Em anexo, envio os documentos para consulta.</p>\n\n<p>Atenciosamente,</p>\n<p><strong>{{nome_usuario}}</strong></p>",
  },
  NAO_FATURAR: {
    assunto: "[NÃO FATURAR] {{nome_usuario}} - {{paciente_nome}}",
    corpo_html:
      "<p>Prezado(a) {{contato}}.</p>\n\n<p>Informamos que o faturamento do(a) paciente <strong>{{paciente_nome}}</strong>, realizado pelo convênio <strong>{{convenio}}</strong>, na data <strong>{{data_cirurgia}}</strong>, horário de início <strong>{{hora_inicio}}</strong>, <strong>NÃO</strong> deverá ser realizado por essa instituição.</p>\n\n<p>Em anexo, envio os documentos para consulta.</p>\n\n<p>Atenciosamente,</p>\n<p><strong>{{nome_usuario}}</strong></p>",
  },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getDefaultEmailTemplate(tipo: EmailTemplateType): EmailTemplateDraft {
  return DEFAULT_EMAIL_TEMPLATES[tipo];
}

export function renderEmailTemplate(content: string, values = EMAIL_TEMPLATE_PREVIEW_VALUES) {
  let rendered = content;

  Object.entries(values).forEach(([key, value]) => {
    const token = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(escapeRegExp(token), "g"), value);
  });

  return rendered;
}

export function buildEmailPreviewDocument(corpoHtml: string) {
  const renderedBody = renderEmailTemplate(corpoHtml);
  const normalizedBody = renderedBody.trim().toLowerCase();

  if (normalizedBody.includes("<html") || normalizedBody.includes("<!doctype")) {
    return renderedBody;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pré-visualização do email</title>
  </head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-sizing:border-box;">
      ${renderedBody || "<p style=\"color:#64748b;\">Corpo do email vazio.</p>"}
    </div>
  </body>
</html>`;
}

export async function carregarModelosEmail(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from("modelos_email_faturamento")
    .select("id, tipo, assunto, corpo_html, created_at, updated_at")
    .order("tipo", { ascending: true });

  if (error) {
    throw new Error(error.message || "Não foi possível carregar os modelos de email.");
  }

  return (data ?? []) as EmailTemplate[];
}

export async function buscarModeloEmailPorId(id: string): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from("modelos_email_faturamento")
    .select("id, tipo, assunto, corpo_html, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível localizar o modelo de email.");
  }

  return data as EmailTemplate;
}

export async function criarModeloEmail(params: {
  tipo: EmailTemplateType;
  assunto: string;
  corpo_html: string;
}): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from("modelos_email_faturamento")
    .insert({
      tipo: params.tipo,
      assunto: params.assunto,
      corpo_html: params.corpo_html,
      updated_at: new Date().toISOString(),
    })
    .select("id, tipo, assunto, corpo_html, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível criar o modelo de email.");
  }

  return data as EmailTemplate;
}

export async function atualizarModeloEmail(params: {
  id: string;
  assunto: string;
  corpo_html: string;
}): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from("modelos_email_faturamento")
    .update({
      assunto: params.assunto,
      corpo_html: params.corpo_html,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select("id, tipo, assunto, corpo_html, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Não foi possível atualizar o modelo de email.");
  }

  return data as EmailTemplate;
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
