import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  ShieldCheck,
  User,
  Building2,
  CalendarRange,
  Stethoscope,
  Save,
  FolderOpen,
  FileIcon,
  ImageIcon,
  ExternalLink,
  Loader2,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type FormValues = {
  numero_autorizacao: string;
  numero_guia_honorarios: string;
  numero_guia_internacao: string;
  // Paciente
  paciente_nome: string;
  paciente_cpf: string;
  paciente_carteirinha: string;
  paciente_convenio: string;
  // Hospital / Clínica
  hospital_nome: string;
  hospital_codigo_cnes: string;
  // Cirurgia
  data_cirurgia: string;
  data_atendimento: string;
  hora_inicio: string;
  hora_fim: string;
  tipo_cirurgia: string;
  atuou_como: string;
  // Diagnóstico
  diagnostico_cid: string;
  diagnostico_descricao: string;
  // Cirurgião principal
  cirurgiao_principal_nome: string;
  cirurgiao_principal_crm: string;
  cirurgiao_principal_uf: string;
  cirurgiao_principal_cbo: string;
  // Auxiliares
  auxiliar1_nome: string;
  auxiliar1_crm: string;
  auxiliar2_nome: string;
  auxiliar2_crm: string;
  auxiliar3_nome: string;
  auxiliar3_crm: string;
  anestesista_nome: string;
  anestesista_crm: string;
  // Valores
  valor_total_faturado: string;
  valor_total_glosa: string;
  valor_total_liquido: string;
  valor_total_repasse: string;
  forma_pagamento: string;
  grau_participacao: string;
  data_pagamento: string;
  status_pagamento: string;
};

type DocItem = {
  path: string;
  signedUrl: string | null;
  fileName: string;
  isImage: boolean;
};

const defaultValues: FormValues = {
  numero_autorizacao: "",
  numero_guia_honorarios: "",
  numero_guia_internacao: "",
  paciente_nome: "",
  paciente_cpf: "",
  paciente_carteirinha: "",
  paciente_convenio: "",
  hospital_nome: "",
  hospital_codigo_cnes: "",
  data_cirurgia: "",
  data_atendimento: "",
  hora_inicio: "",
  hora_fim: "",
  tipo_cirurgia: "",
  atuou_como: "",
  diagnostico_cid: "",
  diagnostico_descricao: "",
  cirurgiao_principal_nome: "",
  cirurgiao_principal_crm: "",
  cirurgiao_principal_uf: "",
  cirurgiao_principal_cbo: "",
  auxiliar1_nome: "",
  auxiliar1_crm: "",
  auxiliar2_nome: "",
  auxiliar2_crm: "",
  auxiliar3_nome: "",
  auxiliar3_crm: "",
  anestesista_nome: "",
  anestesista_crm: "",
  valor_total_faturado: "",
  valor_total_glosa: "",
  valor_total_liquido: "",
  valor_total_repasse: "",
  forma_pagamento: "",
  grau_participacao: "",
  data_pagamento: "",
  status_pagamento: "pendente",
};

const BUCKET = "NPS-pro";

// ── Helpers visuais ───────────────────────────────────────────────────────────
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
  "h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-300 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 w-full";

// ── Aba de Documentos ─────────────────────────────────────────────────────────
function DocumentosTab({ faturamentoId }: { faturamentoId: string }) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("faturamentos")
        .select("url_guia_autorizacao")
        .eq("id", faturamentoId)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const paths: string[] = Array.isArray(data.url_guia_autorizacao)
        ? (data.url_guia_autorizacao as string[])
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

          return { path, signedUrl: signed?.signedUrl ?? null, fileName, isImage };
        })
      );

      setDocs(items);
      setLoading(false);
    })();
  }, [faturamentoId]);

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

            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                {doc.isImage ? (
                  <ImageIcon className="h-4 w-4 flex-shrink-0 text-violet-400" />
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
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

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

// ── Formulário ────────────────────────────────────────────────────────────────
function FormFields({
  register,
  handleSubmit,
  onSubmit,
  saving,
  isEdit,
  onCancel,
  setValue,
  watch,
}: {
  register: ReturnType<typeof useForm<FormValues>>["register"];
  handleSubmit: ReturnType<typeof useForm<FormValues>>["handleSubmit"];
  onSubmit: (v: FormValues) => Promise<void>;
  saving: boolean;
  isEdit: boolean;
  onCancel: () => void;
  setValue: ReturnType<typeof useForm<FormValues>>["setValue"];
  watch: ReturnType<typeof useForm<FormValues>>["watch"];
}) {
  const statusPagamento = watch("status_pagamento");

  return (
    <form id="guia-autorizacao-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pb-6">

      {/* 1. Identificação */}
      <Section icon={ShieldCheck} color="bg-violet-600" title="Identificação da Guia">
        <Field label="Nº Autorização">
          <input {...register("numero_autorizacao")} className={inputCls} placeholder="Ex: 123456789" />
        </Field>
        <Field label="Nº Guia Honorários">
          <input {...register("numero_guia_honorarios")} className={inputCls} placeholder="Ex: 987654" />
        </Field>
        <Field label="Nº Guia Internação">
          <input {...register("numero_guia_internacao")} className={inputCls} placeholder="Ex: 111222" />
        </Field>
      </Section>

      {/* 2. Paciente */}
      <Section icon={User} color="bg-blue-600" title="Paciente">
        <Field label="Nome do Paciente" span="2">
          <input {...register("paciente_nome")} className={inputCls} placeholder="Nome completo" />
        </Field>
        <Field label="CPF">
          <input {...register("paciente_cpf")} className={inputCls} placeholder="000.000.000-00" />
        </Field>
        <Field label="Nº Carteirinha" span="2">
          <input {...register("paciente_carteirinha")} className={inputCls} placeholder="Número da carteirinha" />
        </Field>
        <Field label="Convênio">
          <input {...register("paciente_convenio")} className={inputCls} placeholder="Nome do convênio" />
        </Field>
      </Section>

      {/* 3. Hospital / Clínica */}
      <Section icon={Building2} color="bg-emerald-600" title="Hospital / Clínica">
        <Field label="Nome do Hospital / Clínica" span="2">
          <input {...register("hospital_nome")} className={inputCls} placeholder="Nome da instituição" />
        </Field>
        <Field label="CNES">
          <input {...register("hospital_codigo_cnes")} className={inputCls} placeholder="Código CNES" />
        </Field>
      </Section>

      {/* 4. Cirurgia */}
      <Section icon={CalendarRange} color="bg-amber-500" title="Dados da Cirurgia">
        <Field label="Data da Cirurgia">
          <input type="date" {...register("data_cirurgia")} className={inputCls} />
        </Field>
        <Field label="Data do Atendimento">
          <input type="date" {...register("data_atendimento")} className={inputCls} />
        </Field>
        <Field label="Hora Início">
          <input type="time" {...register("hora_inicio")} className={inputCls} />
        </Field>
        <Field label="Hora Fim">
          <input type="time" {...register("hora_fim")} className={inputCls} />
        </Field>
        <Field label="Tipo de Cirurgia">
          <input {...register("tipo_cirurgia")} className={inputCls} placeholder="Ex: ELETIVA / EMERGENCIAL" />
        </Field>
        <Field label="Atuou Como">
          <input {...register("atuou_como")} className={inputCls} placeholder="Ex: Cirurgião, Auxiliar..." />
        </Field>
        <Field label="CID">
          <input {...register("diagnostico_cid")} className={inputCls} placeholder="Ex: K35.2" />
        </Field>
        <Field label="Diagnóstico" span="2">
          <input {...register("diagnostico_descricao")} className={inputCls} placeholder="Descrição do diagnóstico" />
        </Field>
      </Section>

      {/* 5. Equipe Cirúrgica */}
      <Section icon={Stethoscope} color="bg-sky-600" title="Equipe Cirúrgica">
        <Field label="Cirurgião Principal" span="2">
          <input {...register("cirurgiao_principal_nome")} className={inputCls} placeholder="Nome completo" />
        </Field>
        <Field label="CRM">
          <input {...register("cirurgiao_principal_crm")} className={inputCls} placeholder="Número CRM" />
        </Field>
        <Field label="UF">
          <input {...register("cirurgiao_principal_uf")} className={inputCls} placeholder="SP" maxLength={2} />
        </Field>
        <Field label="CBO">
          <input {...register("cirurgiao_principal_cbo")} className={inputCls} placeholder="Código CBO" />
        </Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <div className="mt-1 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Auxiliar 1", nameField: "auxiliar1_nome" as const, crmField: "auxiliar1_crm" as const },
              { label: "Auxiliar 2", nameField: "auxiliar2_nome" as const, crmField: "auxiliar2_crm" as const },
              { label: "Auxiliar 3", nameField: "auxiliar3_nome" as const, crmField: "auxiliar3_crm" as const },
              { label: "Anestesista", nameField: "anestesista_nome" as const, crmField: "anestesista_crm" as const },
            ].map(({ label, nameField, crmField }) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <div className="flex gap-2">
                  <input {...register(nameField)} className={inputCls} placeholder="Nome" />
                  <input {...register(crmField)} className={`${inputCls} w-28 flex-shrink-0`} placeholder="CRM" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 6. Valores e Pagamento */}
      <Section icon={DollarSign} color="bg-rose-500" title="Valores e Pagamento">
        <Field label="Valor Total Faturado (R$)">
          <input type="number" step="0.01" min="0" {...register("valor_total_faturado")} className={inputCls} placeholder="0,00" />
        </Field>
        <Field label="Valor Total Glosa (R$)">
          <input type="number" step="0.01" min="0" {...register("valor_total_glosa")} className={inputCls} placeholder="0,00" />
        </Field>
        <Field label="Valor Líquido (R$)">
          <input type="number" step="0.01" min="0" {...register("valor_total_liquido")} className={inputCls} placeholder="0,00" />
        </Field>
        <Field label="Valor Repasse (R$)">
          <input type="number" step="0.01" min="0" {...register("valor_total_repasse")} className={inputCls} placeholder="0,00" />
        </Field>
        <Field label="Forma de Pagamento">
          <input {...register("forma_pagamento")} className={inputCls} placeholder="Ex: Transferência, Cheque..." />
        </Field>
        <Field label="Grau de Participação">
          <input {...register("grau_participacao")} className={inputCls} placeholder="Ex: 01 - Cirurgião" />
        </Field>
        <Field label="Data de Pagamento">
          <input type="date" {...register("data_pagamento")} className={inputCls} />
        </Field>
        <Field label="Status de Pagamento">
          <Select
            value={statusPagamento}
            onValueChange={(v) => setValue("status_pagamento", v)}
          >
            <SelectTrigger className="h-9 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="glosado">Glosado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
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
          className="gap-2 rounded-full bg-violet-600 px-6 text-white hover:bg-violet-700"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Salvar Guia"}
        </Button>
      </div>
    </form>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const GuiaAutorizacaoFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({ defaultValues });

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("faturamentos")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        showError("Não foi possível carregar a guia.");
        navigate("/admin/guia-autorizacao");
        return;
      }

      reset({
        numero_autorizacao: data.numero_autorizacao ?? "",
        numero_guia_honorarios: data.numero_guia_honorarios ?? "",
        numero_guia_internacao: data.numero_guia_internacao ?? "",
        paciente_nome: data.paciente_nome ?? "",
        paciente_cpf: data.paciente_cpf ?? "",
        paciente_carteirinha: data.paciente_carteirinha ?? "",
        paciente_convenio: data.paciente_convenio ?? "",
        hospital_nome: data.hospital_nome ?? "",
        hospital_codigo_cnes: data.hospital_codigo_cnes ?? "",
        data_cirurgia: data.data_cirurgia ?? "",
        data_atendimento: data.data_atendimento ?? "",
        hora_inicio: data.hora_inicio ?? "",
        hora_fim: data.hora_fim ?? "",
        tipo_cirurgia: data.tipo_cirurgia ?? "",
        atuou_como: data.atuou_como ?? "",
        diagnostico_cid: data.diagnostico_cid ?? "",
        diagnostico_descricao: data.diagnostico_descricao ?? "",
        cirurgiao_principal_nome: data.cirurgiao_principal_nome ?? "",
        cirurgiao_principal_crm: data.cirurgiao_principal_crm ?? "",
        cirurgiao_principal_uf: (data.cirurgiao_principal_uf ?? "").trim(),
        cirurgiao_principal_cbo: data.cirurgiao_principal_cbo ?? "",
        auxiliar1_nome: data.auxiliar1_nome ?? "",
        auxiliar1_crm: data.auxiliar1_crm ?? "",
        auxiliar2_nome: data.auxiliar2_nome ?? "",
        auxiliar2_crm: data.auxiliar2_crm ?? "",
        auxiliar3_nome: data.auxiliar3_nome ?? "",
        auxiliar3_crm: data.auxiliar3_crm ?? "",
        anestesista_nome: data.anestesista_nome ?? "",
        anestesista_crm: data.anestesista_crm ?? "",
        valor_total_faturado: data.valor_total_faturado != null ? String(data.valor_total_faturado) : "",
        valor_total_glosa: data.valor_total_glosa != null ? String(data.valor_total_glosa) : "",
        valor_total_liquido: data.valor_total_liquido != null ? String(data.valor_total_liquido) : "",
        valor_total_repasse: data.valor_total_repasse != null ? String(data.valor_total_repasse) : "",
        forma_pagamento: data.forma_pagamento ?? "",
        grau_participacao: data.grau_participacao ?? "",
        data_pagamento: data.data_pagamento ?? "",
        status_pagamento: data.status_pagamento ?? "pendente",
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

    const toNum = (v: string) => (v ? Number(v) : 0);

    const payload = {
      medico_id: user.id,
      numero_autorizacao: values.numero_autorizacao || null,
      numero_guia_honorarios: values.numero_guia_honorarios || null,
      numero_guia_internacao: values.numero_guia_internacao || null,
      paciente_nome: values.paciente_nome || null,
      paciente_cpf: values.paciente_cpf || null,
      paciente_carteirinha: values.paciente_carteirinha || null,
      paciente_convenio: values.paciente_convenio || null,
      hospital_nome: values.hospital_nome || null,
      hospital_codigo_cnes: values.hospital_codigo_cnes || null,
      data_cirurgia: values.data_cirurgia || null,
      data_atendimento: values.data_atendimento || null,
      hora_inicio: values.hora_inicio || null,
      hora_fim: values.hora_fim || null,
      tipo_cirurgia: values.tipo_cirurgia || null,
      atuou_como: values.atuou_como || null,
      diagnostico_cid: values.diagnostico_cid || null,
      diagnostico_descricao: values.diagnostico_descricao || null,
      cirurgiao_principal_nome: values.cirurgiao_principal_nome || null,
      cirurgiao_principal_crm: values.cirurgiao_principal_crm || null,
      cirurgiao_principal_uf: values.cirurgiao_principal_uf || null,
      cirurgiao_principal_cbo: values.cirurgiao_principal_cbo || null,
      auxiliar1_nome: values.auxiliar1_nome || null,
      auxiliar1_crm: values.auxiliar1_crm || null,
      auxiliar2_nome: values.auxiliar2_nome || null,
      auxiliar2_crm: values.auxiliar2_crm || null,
      auxiliar3_nome: values.auxiliar3_nome || null,
      auxiliar3_crm: values.auxiliar3_crm || null,
      anestesista_nome: values.anestesista_nome || null,
      anestesista_crm: values.anestesista_crm || null,
      valor_total_faturado: toNum(values.valor_total_faturado),
      valor_total_glosa: toNum(values.valor_total_glosa),
      valor_total_liquido: toNum(values.valor_total_liquido),
      valor_total_repasse: toNum(values.valor_total_repasse),
      forma_pagamento: values.forma_pagamento || null,
      grau_participacao: values.grau_participacao || null,
      data_pagamento: values.data_pagamento || null,
      status_pagamento: values.status_pagamento,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("faturamentos").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("faturamentos").insert(payload));
    }

    setSaving(false);

    if (error) {
      showError("Não foi possível salvar a guia: " + error.message);
    } else {
      showSuccess(isEdit ? "Guia atualizada com sucesso." : "Guia criada com sucesso.");
      navigate("/admin/guia-autorizacao");
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando dados da guia...
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="guia-autorizacao" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/admin/guia-autorizacao")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  {isEdit ? "Editar Guia de Autorização" : "Nova Guia de Autorização"}
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  {isEdit
                    ? "Atualize os dados da guia de autorização."
                    : "Preencha os dados para cadastrar uma nova guia de autorização."}
                </p>
              </div>
            </div>
            <AdminHeaderActions notificationsCount={0} />
          </header>

          {/* Abas — só na edição */}
          {isEdit ? (
            <Tabs defaultValue="dados" className="flex flex-col gap-4">
              <TabsList className="w-fit rounded-full bg-slate-100 p-1">
                <TabsTrigger
                  value="dados"
                  className="rounded-full px-5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Dados da Guia
                </TabsTrigger>
                <TabsTrigger
                  value="documentos"
                  className="rounded-full px-5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Documentos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="mt-0">
                <FormFields
                  register={register}
                  handleSubmit={handleSubmit}
                  onSubmit={onSubmit}
                  saving={saving}
                  isEdit={isEdit}
                  onCancel={() => navigate("/admin/guia-autorizacao")}
                  setValue={setValue}
                  watch={watch}
                />
              </TabsContent>

              <TabsContent value="documentos" className="mt-0">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white">
                      <FolderOpen className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-semibold text-slate-700">Documentos enviados</h2>
                  </div>
                  <DocumentosTab faturamentoId={id!} />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <FormFields
              register={register}
              handleSubmit={handleSubmit}
              onSubmit={onSubmit}
              saving={saving}
              isEdit={isEdit}
              onCancel={() => navigate("/admin/guia-autorizacao")}
              setValue={setValue}
              watch={watch}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GuiaAutorizacaoFormPage;
