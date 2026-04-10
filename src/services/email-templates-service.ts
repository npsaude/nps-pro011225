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
  "{{usuario_nome}}",
  "{{usuario_crm}}",
  "{{atuou_como}}",
] as const;

export const EMAIL_TEMPLATE_PREVIEW_VALUES: Record<string, string> = {
  contato: "Equipe de faturamento",
  paciente_nome: "Maria da Silva",
  convenio: "Unimed Premium",
  data_cirurgia: "10/04/2026",
  hora_inicio: "07:30",
  hospital_nome: "Hospital São Lucas",
  nome_usuario: "Dr. João Almeida",
  usuario_nome: "Dr. João Almeida",
  usuario_crm: "CRM 123456-SP",
  atuou_como: "Cirurgião",
};

const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplateDraft> = {
  FATURAR: {
    assunto: "[FATURAMENTO] {{usuario_nome}} - {{paciente_nome}}",
    corpo_html:
      "Prezado(a) {{contato}},\n\nSolicitamos o faturamento do paciente {{paciente_nome}}.\n\nHospital: {{hospital_nome}}\nData da cirurgia: {{data_cirurgia}}\nHora de início: {{hora_inicio}}\nConvênio: {{convenio}}\nAtuação do profissional: {{atuou_como}}\n\nEm anexo, envio os documentos para consulta.\n\nAtenciosamente,\n{{usuario_nome}}\nCRM: {{usuario_crm}}",
  },
  NAO_FATURAR: {
    assunto: "[NÃO FATURAR] {{usuario_nome}} - {{paciente_nome}}",
    corpo_html:
      "Prezado(a) {{contato}},\n\nInformamos que o faturamento do paciente {{paciente_nome}} não deverá ser realizado por essa instituição.\n\nHospital: {{hospital_nome}}\nData da cirurgia: {{data_cirurgia}}\nHora de início: {{hora_inicio}}\nConvênio: {{convenio}}\nAtuação do profissional: {{atuou_como}}\n\nEm anexo, envio os documentos para consulta.\n\nAtenciosamente,\n{{usuario_nome}}\nCRM: {{usuario_crm}}",
  },
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function isHtmlTemplate(content: string) {
  const normalized = content.trim().toLowerCase();
  return normalized.includes("<!doctype") || normalized.includes("<html") || /<\/?[a-z][\s\S]*>/i.test(content);
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

export function convertStoredTemplateToEditableText(content: string) {
  if (!isHtmlTemplate(content)) return content;

  return decodeHtmlEntities(
    content
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

export function convertPlainTextToEmailHtml(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();

  const sections = normalized
    ? normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)
    : [];

  const paragraphs = sections.length
    ? sections
        .map((block) => {
          const lines = escapeHtml(block).split("\n");
          return `<p style="margin:0 0 16px;line-height:1.7;font-size:15px;color:#0f172a;">${lines.join("<br />")}</p>`;
        })
        .join("")
    : '<p style="margin:0;line-height:1.7;font-size:15px;color:#64748b;">Corpo do email vazio.</p>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email de faturamento</title>
  </head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
      <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#eff6ff,#f8fafc);">
        <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">
          Faturamento
        </div>
      </div>
      <div style="padding:24px;">
        ${paragraphs}
      </div>
    </div>
  </body>
</html>`;
}

export function buildEmailPreviewDocument(corpoHtml: string) {
  const renderedBody = renderEmailTemplate(corpoHtml);

  if (isHtmlTemplate(renderedBody)) {
    return renderedBody;
  }

  return convertPlainTextToEmailHtml(renderedBody);
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
