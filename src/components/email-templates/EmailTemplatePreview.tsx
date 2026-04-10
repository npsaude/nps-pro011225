import { Mail, Sparkles } from "lucide-react";

import {
  EMAIL_TEMPLATE_LABELS,
  EMAIL_TEMPLATE_PREVIEW_VALUES,
  buildEmailPreviewDocument,
  renderEmailTemplate,
  type EmailTemplateType,
} from "@/services/email-templates-service";

type EmailTemplatePreviewProps = {
  tipo: EmailTemplateType;
  assunto: string;
  corpoHtml: string;
};

export default function EmailTemplatePreview({
  tipo,
  assunto,
  corpoHtml,
}: EmailTemplatePreviewProps) {
  const renderedSubject = renderEmailTemplate(assunto);
  const previewDocument = buildEmailPreviewDocument(corpoHtml);

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <Mail className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Pré-visualização do email</h2>
            <p className="text-xs text-slate-500">{EMAIL_TEMPLATE_LABELS[tipo]} com variáveis preenchidas e formatação final aplicada.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Assunto renderizado</p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {renderedSubject || "Assunto vazio."}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Dados usados no preview
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(EMAIL_TEMPLATE_PREVIEW_VALUES).map(([key, value]) => (
              <div
                key={key}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600"
              >
                <span className="font-semibold text-slate-800">{`{{${key}}}`}</span>
                <span className="mx-1 text-slate-300">→</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pb-5">
        <div className="flex h-full min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <iframe
            title="Prévia do email"
            srcDoc={previewDocument}
            sandbox=""
            className="h-full min-h-[420px] w-full bg-white"
          />
        </div>
      </div>
    </div>
  );
}