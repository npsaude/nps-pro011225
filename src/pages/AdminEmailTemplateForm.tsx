import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Mail, Save } from "lucide-react";

import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import AdminSidebar from "@/components/admin/AdminSidebar";
import EmailTemplatePreview from "@/components/email-templates/EmailTemplatePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buscarModeloEmailPorId,
  carregarModelosEmail,
  criarModeloEmail,
  atualizarModeloEmail,
  convertStoredTemplateToEditableText,
  EMAIL_TEMPLATE_DESCRIPTIONS,
  EMAIL_TEMPLATE_LABELS,
  EMAIL_TEMPLATE_TYPES,
  EMAIL_TEMPLATE_VARIABLES,
  getDefaultEmailTemplate,
  type EmailTemplateType,
} from "@/services/email-templates-service";
import { showError, showSuccess } from "@/utils/toast";

type FormState = {
  tipo: EmailTemplateType;
  assunto: string;
  corpo_html: string;
};

export default function AdminEmailTemplateForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();

  const mode = !id ? "create" : location.pathname.endsWith("/editar") ? "edit" : "view";
  const isView = mode === "view";
  const isCreate = mode === "create";

  const [form, setForm] = useState<FormState>({
    tipo: "FATURAR",
    ...getDefaultEmailTemplate("FATURAR"),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<EmailTemplateType[]>(EMAIL_TEMPLATE_TYPES);

  const pageTitle =
    mode === "create"
      ? "Novo modelo de email"
      : mode === "edit"
        ? "Editar modelo de email"
        : "Visualizar modelo de email";

  const pageDescription =
    mode === "create"
      ? "Cadastre um novo modelo em texto normal e acompanhe a pré-visualização do email pronto."
      : mode === "edit"
        ? "Edite o assunto e o texto do email com preview em tempo real."
        : "Confira o conteúdo salvo e a renderização final do email.";

  const hydrateCreateState = useCallback(
    (tipo: EmailTemplateType, options: EmailTemplateType[]) => {
      const allowedType = options.includes(tipo) ? tipo : options[0] ?? tipo;
      const defaults = getDefaultEmailTemplate(allowedType);

      setForm({
        tipo: allowedType,
        assunto: defaults.assunto,
        corpo_html: defaults.corpo_html,
      });
    },
    [],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const allTemplates = await carregarModelosEmail();

        if (isCreate) {
          const configuredTypes = new Set(allTemplates.map((item) => item.tipo));
          const missingTypes = EMAIL_TEMPLATE_TYPES.filter((tipo) => !configuredTypes.has(tipo));
          const requestedType = searchParams.get("tipo") as EmailTemplateType | null;

          setAvailableTypes(missingTypes);

          if (missingTypes.length > 0) {
            hydrateCreateState(requestedType ?? missingTypes[0], missingTypes);
          }

          return;
        }

        if (!id) return;

        const template = await buscarModeloEmailPorId(id);
        setAvailableTypes([template.tipo]);
        setForm({
          tipo: template.tipo,
          assunto: template.assunto,
          corpo_html: convertStoredTemplateToEditableText(template.corpo_html),
        });
      } catch (error) {
        showError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o modelo de email.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [hydrateCreateState, id, isCreate, searchParams]);

  const handleTipoChange = (tipo: EmailTemplateType) => {
    if (!isCreate) return;

    const defaults = getDefaultEmailTemplate(tipo);
    setForm({
      tipo,
      assunto: defaults.assunto,
      corpo_html: defaults.corpo_html,
    });
  };

  const handleSave = async () => {
    if (!form.assunto.trim()) {
      showError("Preencha o assunto do modelo.");
      return;
    }

    if (!form.corpo_html.trim()) {
      showError("Preencha o corpo do email.");
      return;
    }

    setSaving(true);

    try {
      const saved = isCreate
        ? await criarModeloEmail({
            tipo: form.tipo,
            assunto: form.assunto.trim(),
            corpo_html: form.corpo_html,
          })
        : await atualizarModeloEmail({
            id: id as string,
            assunto: form.assunto.trim(),
            corpo_html: form.corpo_html,
          });

      showSuccess(
        isCreate
          ? "Modelo de email criado com sucesso."
          : "Modelo de email atualizado com sucesso.",
      );
      navigate(`/admin/modelos-emails/${saved.id}`);
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o modelo de email.",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedDescription = useMemo(() => {
    return EMAIL_TEMPLATE_DESCRIPTIONS[form.tipo];
  }, [form.tipo]);

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="modelos-email" />

        <div className="flex flex-1 flex-col gap-5 rounded-3xl bg-transparent lg:py-1">
          <header className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <button
                  type="button"
                  onClick={() => navigate("/admin/modelos-emails")}
                  className="transition hover:text-slate-800"
                >
                  Modelos de Emails
                </button>
                <ChevronRight className="h-3 w-3" />
                <span className="text-blue-700">{pageTitle}</span>
              </div>
              <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Mail className="h-4 w-4" />
                </span>
                {pageTitle}
              </h1>
              <p className="text-xs text-slate-400 sm:text-sm">{pageDescription}</p>
            </div>
            <AdminHeaderActions notificationsCount={0} />
          </header>

          {loading ? (
            <div className="rounded-3xl bg-white/90 p-10 text-center text-sm text-slate-400 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              Carregando modelo de email...
            </div>
          ) : isCreate && availableTypes.length === 0 ? (
            <div className="rounded-3xl bg-white/90 p-10 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
                <h2 className="text-base font-semibold">Todos os tipos já estão cadastrados</h2>
                <p className="mt-2 text-sm">
                  Como a tabela <code className="rounded bg-white px-1.5 py-0.5">public.modelos_email_faturamento</code>
                  {' '}trabalha com os tipos fixos deste fluxo, neste momento basta editar um modelo existente.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/admin/modelos-emails")}
                >
                  Voltar para a listagem
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/admin/modelos-emails")}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>

                    {isView ? (
                      <Button
                        type="button"
                        className="bg-amber-500 text-white hover:bg-amber-600"
                        onClick={() => navigate(`/admin/modelos-emails/${id}/editar`)}
                      >
                        Editar modelo
                      </Button>
                    ) : (
                      <Button type="button" onClick={handleSave} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Salvando..." : "Salvar modelo"}
                      </Button>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Variáveis disponíveis
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {EMAIL_TEMPLATE_VARIABLES.map((variable) => (
                        <code
                          key={variable}
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700"
                        >
                          {variable}
                        </code>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="tipo" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Tipo de modelo
                      </Label>
                      {isView ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                          <p className="font-medium">{EMAIL_TEMPLATE_LABELS[form.tipo]}</p>
                          <p className="mt-1 text-xs text-slate-500">{selectedDescription}</p>
                        </div>
                      ) : (
                        <Select value={form.tipo} onValueChange={handleTipoChange} disabled={!isCreate}>
                          <SelectTrigger id="tipo" className="h-11 rounded-2xl border-slate-200 bg-white">
                            <SelectValue placeholder="Selecione um tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTypes.map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>
                                {EMAIL_TEMPLATE_LABELS[tipo]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <p className="text-xs text-slate-500">{selectedDescription}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assunto" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Assunto
                      </Label>
                      {isView ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                          {form.assunto || "—"}
                        </div>
                      ) : (
                        <Input
                          id="assunto"
                          value={form.assunto}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, assunto: event.target.value }))
                          }
                          className="h-11 rounded-2xl border-slate-200 bg-white"
                          placeholder="Digite o assunto do email"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="corpo_html" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Corpo do email
                      </Label>
                      {isView ? (
                        <pre className="max-h-[360px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-[12px] leading-6 text-slate-700 whitespace-pre-wrap">
                          {form.corpo_html || "—"}
                        </pre>
                      ) : (
                        <Textarea
                          id="corpo_html"
                          value={form.corpo_html}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, corpo_html: event.target.value }))
                          }
                          className="min-h-[360px] rounded-2xl border-slate-200 bg-white text-[13px] leading-6"
                          placeholder="Digite o texto do email. Você pode usar variáveis como {{paciente_nome}} e {{usuario_crm}}."
                        />
                      )}
                      <p className="text-xs text-slate-500">
                        Escreva em texto normal. O sistema aplica a formatação final do email automaticamente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <EmailTemplatePreview
                tipo={form.tipo}
                assunto={form.assunto}
                corpoHtml={form.corpo_html}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}