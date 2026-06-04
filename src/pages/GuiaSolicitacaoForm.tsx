import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  FileText,
  User,
  Building2,
  CalendarRange,
  Stethoscope,
  Save,
  FolderOpen,
  ImageIcon,
  FileIcon,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminFormLayout from "@/features/admin/forms/AdminFormLayout";
import FormLoadingScreen from "@/features/admin/forms/FormLoadingScreen";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchGuiaSolicitacao,
  saveGuiaSolicitacao,
} from "@/services/guia-solicitacao-service";
import { showError, showSuccess } from "@/utils/toast";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type FormValues = {
  registro_ans: string;
  numero_guia_prestador: string;
  numero_guia_solicitacao: string;
  numero_guia_operadora: string;
  senha: string;
  numero_carteira: string;
  nome_beneficiario: string;
  nome_social: string;
  atendimento_rn: string;
  contratado_codigo_operadora: string;
  contratado_nome: string;
  contratado_cnes: string;
  executante_codigo_operadora: string;
  executante_nome: string;
  executante_cnes: string;
  profissional_seq_ref: string;
  profissional_grau_participacao: string;
  profissional_cpf: string;
  profissional_nome: string;
  profissional_conselho_codigo: string;
  profissional_numero_conselho: string;
  profissional_uf: string;
  profissional_cbo: string;
  data_inicio_faturamento: string;
  data_fim_faturamento: string;
  data_emissao: string;
  valor_total_honorarios: string;
  valor_total_faturamento: string;
  observacao: string;
};

type DocItem = {
  path: string;
  signedUrl: string | null;
  fileName: string;
  isImage: boolean;
};

const defaultValues: FormValues = {
  registro_ans: "",
  numero_guia_prestador: "",
  numero_guia_solicitacao: "",
  numero_guia_operadora: "",
  senha: "",
  numero_carteira: "",
  nome_beneficiario: "",
  nome_social: "",
  atendimento_rn: "",
  contratado_codigo_operadora: "",
  contratado_nome: "",
  contratado_cnes: "",
  executante_codigo_operadora: "",
  executante_nome: "",
  executante_cnes: "",
  profissional_seq_ref: "",
  profissional_grau_participacao: "",
  profissional_cpf: "",
  profissional_nome: "",
  profissional_conselho_codigo: "",
  profissional_numero_conselho: "",
  profissional_uf: "",
  profissional_cbo: "",
  data_inicio_faturamento: "",
  data_fim_faturamento: "",
  data_emissao: "",
  valor_total_honorarios: "",
  valor_total_faturamento: "",
  observacao: "",
};

const BUCKET = "NPS-pro";

// ── Seção visual ──────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  color,
  title,
  children,
}: {
  icon: React.ElementType;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${color}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  span,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  span?: "full" | "2";
}) {
  return (
    <div className={span === "full" ? "sm:col-span-2 lg:col-span-3" : span === "2" ? "sm:col-span-2" : ""}>
      <Label className="mb-1 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

const inputCls =
  "h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";

// ── Componente de Documentos ──────────────────────────────────────────────────
function DocumentosTab({ guiaId }: { guiaId: string }) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("guia_solicitacao")
        .select("url_documentos")
        .eq("id", guiaId)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const paths: string[] = Array.isArray(data.url_documentos)
        ? (data.url_documentos as string[])
        : [];

      if (paths.length === 0) {
        setLoading(false);
        setDocs([]);
        return;
      }

      const items = await Promise.all(
        paths.map(async (path) => {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, 60 * 60);

          const fileName = path.split("/").pop() ?? path;
          const isImage = /\.(png|jpe?g|gif|webp)$/i.test(path);

          return {
            path,
            signedUrl: signed?.signedUrl ?? null,
            fileName,
            isImage,
          };
        })
      );

      setDocs(items);
      setLoading(false);
    })();
  }, [guiaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando documentos...</span>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
        <FolderOpen className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">Nenhum documento enviado</p>
        <p className="mt-1 text-xs text-slate-400">
          Os arquivos enviados via upload aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {docs.map((doc) => (
          <div
            key={doc.path}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md"
          >
            {/* Preview */}
            <div className="flex h-40 items-center justify-center overflow-hidden bg-slate-50">
              {doc.isImage && doc.signedUrl ? (
                <img
                  src={doc.signedUrl}
                  alt={doc.fileName}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <FileIcon className="h-12 w-12" />
                  <span className="text-[11px] text-slate-400">Documento</span>
                </div>
              )}
            </div>

            {/* Info + ações */}
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                {doc.isImage ? (
                  <ImageIcon className="h-4 w-4 flex-shrink-0 text-blue-400" />
                ) : (
                  <FileIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                )}
                <span className="truncate text-xs text-slate-600" title={doc.fileName}>
                  {doc.fileName}
                </span>
              </div>
              {doc.signedUrl && (
                <a
                  href={doc.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir em nova aba"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {/* Clique para ampliar imagem */}
            {doc.isImage && doc.signedUrl && (
              <button
                onClick={() => setLightbox(doc.signedUrl)}
                className="absolute inset-0 h-40 w-full cursor-zoom-in"
                aria-label="Ampliar imagem"
              />
            )}
          </div>
        ))}
      </div>

      {/* Lightbox simples */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Visualização"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const GuiaSolicitacaoFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues });

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoadingData(true);
      const data = await fetchGuiaSolicitacao(id);

      if (!data) {
        showError("Não foi possível carregar a guia.");
        navigate("/admin/guia-solicitacao");
        return;
      }

      reset({
        registro_ans: data.registro_ans ?? "",
        numero_guia_prestador: data.numero_guia_prestador ?? "",
        numero_guia_solicitacao: data.numero_guia_solicitacao ?? "",
        numero_guia_operadora: data.numero_guia_operadora ?? "",
        senha: data.senha ?? "",
        numero_carteira: data.numero_carteira ?? "",
        nome_beneficiario: data.nome_beneficiario ?? "",
        nome_social: data.nome_social ?? "",
        atendimento_rn: data.atendimento_rn ?? "",
        contratado_codigo_operadora: data.contratado_codigo_operadora ?? "",
        contratado_nome: data.contratado_nome ?? "",
        contratado_cnes: data.contratado_cnes ?? "",
        executante_codigo_operadora: data.executante_codigo_operadora ?? "",
        executante_nome: data.executante_nome ?? "",
        executante_cnes: data.executante_cnes ?? "",
        profissional_seq_ref: data.profissional_seq_ref ?? "",
        profissional_grau_participacao: data.profissional_grau_participacao ?? "",
        profissional_cpf: data.profissional_cpf ?? "",
        profissional_nome: data.profissional_nome ?? "",
        profissional_conselho_codigo: data.profissional_conselho_codigo ?? "",
        profissional_numero_conselho: data.profissional_numero_conselho ?? "",
        profissional_uf: (data.profissional_uf ?? "").trim(),
        profissional_cbo: data.profissional_cbo ?? "",
        data_inicio_faturamento: data.data_inicio_faturamento ?? "",
        data_fim_faturamento: data.data_fim_faturamento ?? "",
        data_emissao: data.data_emissao ?? "",
        valor_total_honorarios:
          data.valor_total_honorarios != null ? String(data.valor_total_honorarios) : "",
        valor_total_faturamento:
          data.valor_total_faturamento != null ? String(data.valor_total_faturamento) : "",
        observacao: data.observacao ?? "",
      });
      setLoadingData(false);
    })();
  }, [id, navigate, reset]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Usuário não autenticado.");
      setSaving(false);
      return;
    }

    const payload = {
      medico_id: user.id,
      registro_ans: values.registro_ans || null,
      numero_guia_prestador: values.numero_guia_prestador || null,
      numero_guia_solicitacao: values.numero_guia_solicitacao || null,
      numero_guia_operadora: values.numero_guia_operadora || null,
      senha: values.senha || null,
      numero_carteira: values.numero_carteira || null,
      nome_beneficiario: values.nome_beneficiario || null,
      nome_social: values.nome_social || null,
      atendimento_rn: values.atendimento_rn || null,
      contratado_codigo_operadora: values.contratado_codigo_operadora || null,
      contratado_nome: values.contratado_nome || null,
      contratado_cnes: values.contratado_cnes || null,
      executante_codigo_operadora: values.executante_codigo_operadora || null,
      executante_nome: values.executante_nome || null,
      executante_cnes: values.executante_cnes || null,
      profissional_seq_ref: values.profissional_seq_ref || null,
      profissional_grau_participacao: values.profissional_grau_participacao || null,
      profissional_cpf: values.profissional_cpf || null,
      profissional_nome: values.profissional_nome || null,
      profissional_conselho_codigo: values.profissional_conselho_codigo || null,
      profissional_numero_conselho: values.profissional_numero_conselho || null,
      profissional_uf: values.profissional_uf || null,
      profissional_cbo: values.profissional_cbo || null,
      data_inicio_faturamento: values.data_inicio_faturamento || null,
      data_fim_faturamento: values.data_fim_faturamento || null,
      data_emissao: values.data_emissao || null,
      valor_total_honorarios: values.valor_total_honorarios ? Number(values.valor_total_honorarios) : null,
      valor_total_faturamento: values.valor_total_faturamento ? Number(values.valor_total_faturamento) : null,
      observacao: values.observacao || null,
    };

    const { error } = await saveGuiaSolicitacao(payload, isEdit ? id : undefined);

    setSaving(false);

    if (error) {
      showError("Não foi possível salvar a guia: " + error.message);
    } else {
      showSuccess(isEdit ? "Guia atualizada com sucesso." : "Guia criada com sucesso.");
      navigate("/admin/guia-solicitacao");
    }
  };

  if (loadingData) {
    return <FormLoadingScreen />;
  }

  return (
    <AdminFormLayout
      sidebar={<AdminSidebar section="guia-solicitacao" />}
      accent="blue"
      icon={FileText}
      title={isEdit ? "Editar Guia" : "Nova Guia de Solicitação"}
      subtitle={
        isEdit
          ? "Atualize os dados da guia de solicitação."
          : "Preencha os dados para cadastrar uma nova guia de solicitação."
      }
      onBack={() => navigate("/admin/guia-solicitacao")}
    >
      {/* Abas — só mostra se for edição */}
      {isEdit ? (
            <Tabs defaultValue="dados" className="flex flex-col gap-4">
              <TabsList className="w-fit rounded-full bg-slate-100 p-1">
                <TabsTrigger
                  value="dados"
                  className="rounded-full px-5 text-sm text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Dados da Guia
                </TabsTrigger>
                <TabsTrigger
                  value="documentos"
                  className="rounded-full px-5 text-sm text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Documentos
                </TabsTrigger>
              </TabsList>

              {/* Aba: Dados */}
              <TabsContent value="dados" className="mt-0">
                <FormFields
                  register={register}
                  handleSubmit={handleSubmit}
                  onSubmit={onSubmit}
                  saving={saving}
                  isEdit={isEdit}
                  onCancel={() => navigate("/admin/guia-solicitacao")}
                />
              </TabsContent>

              {/* Aba: Documentos */}
              <TabsContent value="documentos" className="mt-0">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                      <FolderOpen className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-semibold text-slate-700">
                      Documentos enviados
                    </h2>
                  </div>
                  <DocumentosTab guiaId={id!} />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* Nova guia: sem abas */
            <FormFields
              register={register}
              handleSubmit={handleSubmit}
              onSubmit={onSubmit}
              saving={saving}
              isEdit={isEdit}
              onCancel={() => navigate("/admin/guia-solicitacao")}
            />
          )}
    </AdminFormLayout>
  );
};

// ── Formulário extraído para reutilização ─────────────────────────────────────
function FormFields({
  register,
  handleSubmit,
  onSubmit,
  saving,
  isEdit,
  onCancel,
}: {
  register: ReturnType<typeof useForm<FormValues>>["register"];
  handleSubmit: ReturnType<typeof useForm<FormValues>>["handleSubmit"];
  onSubmit: (v: FormValues) => Promise<void>;
  saving: boolean;
  isEdit: boolean;
  onCancel: () => void;
}) {
  return (
    <form
      id="guia-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 pb-6"
    >
      {/* 1. Identificação */}
      <Section icon={FileText} color="bg-blue-600" title="Identificação da Guia">
        <Field label="Registro ANS">
          <input {...register("registro_ans")} className={inputCls} placeholder="000000" />
        </Field>
        <Field label="Nº Guia Prestador">
          <input {...register("numero_guia_prestador")} className={inputCls} placeholder="Ex: 12345" />
        </Field>
        <Field label="Nº Guia Solicitação">
          <input {...register("numero_guia_solicitacao")} className={inputCls} placeholder="Ex: 67890" />
        </Field>
        <Field label="Nº Guia Operadora">
          <input {...register("numero_guia_operadora")} className={inputCls} placeholder="Ex: 99999" />
        </Field>
        <Field label="Senha">
          <input {...register("senha")} className={inputCls} placeholder="Senha de autorização" />
        </Field>
        <Field label="Data de Emissão">
          <input type="date" {...register("data_emissao")} className={inputCls} />
        </Field>
      </Section>

      {/* 2. Beneficiário */}
      <Section icon={User} color="bg-violet-600" title="Beneficiário">
        <Field label="Nº Carteira">
          <input {...register("numero_carteira")} className={inputCls} placeholder="Número da carteirinha" />
        </Field>
        <Field label="Nome do Beneficiário" span="2">
          <input {...register("nome_beneficiario")} className={inputCls} placeholder="Nome completo" />
        </Field>
        <Field label="Nome Social" span="2">
          <input {...register("nome_social")} className={inputCls} placeholder="Nome social (se houver)" />
        </Field>
        <Field label="Atendimento RN">
          <input {...register("atendimento_rn")} className={inputCls} placeholder="S / N" />
        </Field>
      </Section>

      {/* 3. Contratado / Executante */}
      <Section icon={Building2} color="bg-emerald-600" title="Contratado e Executante">
        <Field label="Cód. Operadora (Contratado)">
          <input {...register("contratado_codigo_operadora")} className={inputCls} placeholder="Código" />
        </Field>
        <Field label="Nome do Contratado" span="2">
          <input {...register("contratado_nome")} className={inputCls} placeholder="Nome da instituição" />
        </Field>
        <Field label="CNES (Contratado)">
          <input {...register("contratado_cnes")} className={inputCls} placeholder="CNES" />
        </Field>
        <Field label="Cód. Operadora (Executante)">
          <input {...register("executante_codigo_operadora")} className={inputCls} placeholder="Código" />
        </Field>
        <Field label="Nome do Executante">
          <input {...register("executante_nome")} className={inputCls} placeholder="Nome" />
        </Field>
        <Field label="CNES (Executante)">
          <input {...register("executante_cnes")} className={inputCls} placeholder="CNES" />
        </Field>
      </Section>

      {/* 4. Profissional */}
      <Section icon={Stethoscope} color="bg-sky-600" title="Profissional Executante">
        <Field label="Seq. Ref.">
          <input {...register("profissional_seq_ref")} className={inputCls} placeholder="Seq." />
        </Field>
        <Field label="Grau de Participação">
          <input {...register("profissional_grau_participacao")} className={inputCls} placeholder="Ex: 01" />
        </Field>
        <Field label="CPF">
          <input {...register("profissional_cpf")} className={inputCls} placeholder="000.000.000-00" />
        </Field>
        <Field label="Nome do Profissional" span="2">
          <input {...register("profissional_nome")} className={inputCls} placeholder="Nome completo" />
        </Field>
        <Field label="Conselho">
          <input {...register("profissional_conselho_codigo")} className={inputCls} placeholder="CRM / CRO..." />
        </Field>
        <Field label="Nº Conselho">
          <input {...register("profissional_numero_conselho")} className={inputCls} placeholder="Número" />
        </Field>
        <Field label="UF">
          <input {...register("profissional_uf")} className={inputCls} placeholder="SP" maxLength={2} />
        </Field>
        <Field label="CBO">
          <input {...register("profissional_cbo")} className={inputCls} placeholder="Código CBO" />
        </Field>
      </Section>

      {/* 5. Faturamento */}
      <Section icon={CalendarRange} color="bg-amber-500" title="Valores e Período">
        <Field label="Início do Faturamento">
          <input type="date" {...register("data_inicio_faturamento")} className={inputCls} />
        </Field>
        <Field label="Fim do Faturamento">
          <input type="date" {...register("data_fim_faturamento")} className={inputCls} />
        </Field>
        <Field label="Valor Total Honorários (R$)">
          <input type="number" step="0.01" min="0" {...register("valor_total_honorarios")} className={inputCls} placeholder="0,00" />
        </Field>
        <Field label="Valor Total Faturamento (R$)">
          <input type="number" step="0.01" min="0" {...register("valor_total_faturamento")} className={inputCls} placeholder="0,00" />
        </Field>
        <Field label="Observações" span="full">
          <Textarea
            {...register("observacao")}
            rows={3}
            placeholder="Observações adicionais sobre a guia..."
            className="resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </Field>
      </Section>

      {/* Rodapé */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border-slate-300 bg-white px-6 text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="gap-2 rounded-full bg-blue-600 px-6 text-white hover:bg-blue-700"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Salvar Guia"}
        </Button>
      </div>
    </form>
  );
}

export default GuiaSolicitacaoFormPage;