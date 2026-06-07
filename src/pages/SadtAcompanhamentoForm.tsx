import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Activity,
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
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import MedicoFloatingNav from "@/components/medico/MedicoFloatingNav";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type FormValues = {
  registro_ans: string;
  numero_guia_prestador: string;
  numero_guia_sadt: string;
  numero_guia_operadora: string;
  senha: string;

  numero_carteira: string;
  nome_beneficiario: string;
  nome_social: string;
  atendimento_rn: string;

  solicitante_codigo_operadora: string;
  solicitante_nome: string;
  solicitante_cnes: string;

  solicitante_profissional_nome: string;
  solicitante_profissional_conselho_codigo: string;
  solicitante_profissional_numero_conselho: string;
  solicitante_profissional_uf: string;
  solicitante_profissional_cbo: string;

  executante_codigo_operadora: string;
  executante_nome: string;
  executante_cnes: string;

  carater_atendimento: string;
  data_solicitacao: string;
  indicacao_clinica: string;
  tipo_atendimento: string;
  indicacao_acidente: string;
  tipo_consulta: string;
  motivo_encerramento: string;

  data_autorizacao: string;
  data_validade_senha: string;
  data_inicio_atendimento: string;
  data_fim_atendimento: string;
  data_emissao: string;

  valor_total_procedimentos: string;
  valor_total_taxas: string;
  valor_total_materiais: string;
  valor_total_medicamentos: string;
  valor_total_geral: string;

  observacao: string;

  profissional_seq_ref: string;
  profissional_grau_participacao: string;
  profissional_cpf: string;
  profissional_nome: string;
  profissional_conselho_codigo: string;
  profissional_numero_conselho: string;
  profissional_uf: string;
  profissional_cbo: string;
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
  numero_guia_sadt: "",
  numero_guia_operadora: "",
  senha: "",

  numero_carteira: "",
  nome_beneficiario: "",
  nome_social: "",
  atendimento_rn: "",

  solicitante_codigo_operadora: "",
  solicitante_nome: "",
  solicitante_cnes: "",

  solicitante_profissional_nome: "",
  solicitante_profissional_conselho_codigo: "",
  solicitante_profissional_numero_conselho: "",
  solicitante_profissional_uf: "",
  solicitante_profissional_cbo: "",

  executante_codigo_operadora: "",
  executante_nome: "",
  executante_cnes: "",

  carater_atendimento: "",
  data_solicitacao: "",
  indicacao_clinica: "",
  tipo_atendimento: "",
  indicacao_acidente: "",
  tipo_consulta: "",
  motivo_encerramento: "",

  data_autorizacao: "",
  data_validade_senha: "",
  data_inicio_atendimento: "",
  data_fim_atendimento: "",
  data_emissao: "",

  valor_total_procedimentos: "",
  valor_total_taxas: "",
  valor_total_materiais: "",
  valor_total_medicamentos: "",
  valor_total_geral: "",

  observacao: "",

  profissional_seq_ref: "",
  profissional_grau_participacao: "",
  profissional_cpf: "",
  profissional_nome: "",
  profissional_conselho_codigo: "",
  profissional_numero_conselho: "",
  profissional_uf: "",
  profissional_cbo: "",
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
  "h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-300 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 w-full";

// ── Tab de Documentos ─────────────────────────────────────────────────────────
function DocumentosTab({ sadtId }: { sadtId: string }) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("sadt_acompanhamento")
        .select("url_documentos")
        .eq("id", sadtId)
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
  }, [sadtId]);

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
                  <ImageIcon className="h-4 w-4 flex-shrink-0 text-teal-400" />
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
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-teal-50 hover:text-teal-600"
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

// ── Página principal ──────────────────────────────────────────────────────────
const SadtAcompanhamentoFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMedicoRoute = location.pathname.startsWith("/medico/");
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  const { register, handleSubmit, reset } = useForm<FormValues>({ defaultValues });

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("sadt_acompanhamento")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        showError("Não foi possível carregar a SADT.");
        navigate("/admin/sadt-acompanhamento");
        return;
      }

      reset({
        registro_ans: data.registro_ans ?? "",
        numero_guia_prestador: data.numero_guia_prestador ?? "",
        numero_guia_sadt: data.numero_guia_sadt ?? "",
        numero_guia_operadora: data.numero_guia_operadora ?? "",
        senha: data.senha ?? "",

        numero_carteira: data.numero_carteira ?? "",
        nome_beneficiario: data.nome_beneficiario ?? "",
        nome_social: data.nome_social ?? "",
        atendimento_rn: data.atendimento_rn ?? "",

        solicitante_codigo_operadora: data.solicitante_codigo_operadora ?? "",
        solicitante_nome: data.solicitante_nome ?? "",
        solicitante_cnes: data.solicitante_cnes ?? "",

        solicitante_profissional_nome: data.solicitante_profissional_nome ?? "",
        solicitante_profissional_conselho_codigo: data.solicitante_profissional_conselho_codigo ?? "",
        solicitante_profissional_numero_conselho: data.solicitante_profissional_numero_conselho ?? "",
        solicitante_profissional_uf: (data.solicitante_profissional_uf ?? "").trim(),
        solicitante_profissional_cbo: data.solicitante_profissional_cbo ?? "",

        executante_codigo_operadora: data.executante_codigo_operadora ?? "",
        executante_nome: data.executante_nome ?? "",
        executante_cnes: data.executante_cnes ?? "",

        carater_atendimento: data.carater_atendimento ?? "",
        data_solicitacao: data.data_solicitacao ?? "",
        indicacao_clinica: data.indicacao_clinica ?? "",
        tipo_atendimento: data.tipo_atendimento ?? "",
        indicacao_acidente: data.indicacao_acidente ?? "",
        tipo_consulta: data.tipo_consulta ?? "",
        motivo_encerramento: data.motivo_encerramento ?? "",

        data_autorizacao: data.data_autorizacao ?? "",
        data_validade_senha: data.data_validade_senha ?? "",
        data_inicio_atendimento: data.data_inicio_atendimento ?? "",
        data_fim_atendimento: data.data_fim_atendimento ?? "",
        data_emissao: data.data_emissao ?? "",

        valor_total_procedimentos: data.valor_total_procedimentos != null ? String(data.valor_total_procedimentos) : "",
        valor_total_taxas: data.valor_total_taxas != null ? String(data.valor_total_taxas) : "",
        valor_total_materiais: data.valor_total_materiais != null ? String(data.valor_total_materiais) : "",
        valor_total_medicamentos: data.valor_total_medicamentos != null ? String(data.valor_total_medicamentos) : "",
        valor_total_geral: data.valor_total_geral != null ? String(data.valor_total_geral) : "",

        observacao: data.observacao ?? "",

        profissional_seq_ref: data.profissional_seq_ref ?? "",
        profissional_grau_participacao: data.profissional_grau_participacao ?? "",
        profissional_cpf: data.profissional_cpf ?? "",
        profissional_nome: data.profissional_nome ?? "",
        profissional_conselho_codigo: data.profissional_conselho_codigo ?? "",
        profissional_numero_conselho: data.profissional_numero_conselho ?? "",
        profissional_uf: (data.profissional_uf ?? "").trim(),
        profissional_cbo: data.profissional_cbo ?? "",
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
      numero_guia_sadt: values.numero_guia_sadt || null,
      numero_guia_operadora: values.numero_guia_operadora || null,
      senha: values.senha || null,

      numero_carteira: values.numero_carteira || null,
      nome_beneficiario: values.nome_beneficiario || null,
      nome_social: values.nome_social || null,
      atendimento_rn: values.atendimento_rn || null,

      solicitante_codigo_operadora: values.solicitante_codigo_operadora || null,
      solicitante_nome: values.solicitante_nome || null,
      solicitante_cnes: values.solicitante_cnes || null,

      solicitante_profissional_nome: values.solicitante_profissional_nome || null,
      solicitante_profissional_conselho_codigo: values.solicitante_profissional_conselho_codigo || null,
      solicitante_profissional_numero_conselho: values.solicitante_profissional_numero_conselho || null,
      solicitante_profissional_uf: values.solicitante_profissional_uf || null,
      solicitante_profissional_cbo: values.solicitante_profissional_cbo || null,

      executante_codigo_operadora: values.executante_codigo_operadora || null,
      executante_nome: values.executante_nome || null,
      executante_cnes: values.executante_cnes || null,

      carater_atendimento: values.carater_atendimento || null,
      data_solicitacao: values.data_solicitacao || null,
      indicacao_clinica: values.indicacao_clinica || null,
      tipo_atendimento: values.tipo_atendimento || null,
      indicacao_acidente: values.indicacao_acidente || null,
      tipo_consulta: values.tipo_consulta || null,
      motivo_encerramento: values.motivo_encerramento || null,

      data_autorizacao: values.data_autorizacao || null,
      data_validade_senha: values.data_validade_senha || null,
      data_inicio_atendimento: values.data_inicio_atendimento || null,
      data_fim_atendimento: values.data_fim_atendimento || null,
      data_emissao: values.data_emissao || null,

      valor_total_procedimentos: values.valor_total_procedimentos ? Number(values.valor_total_procedimentos) : null,
      valor_total_taxas: values.valor_total_taxas ? Number(values.valor_total_taxas) : null,
      valor_total_materiais: values.valor_total_materiais ? Number(values.valor_total_materiais) : null,
      valor_total_medicamentos: values.valor_total_medicamentos ? Number(values.valor_total_medicamentos) : null,
      valor_total_geral: values.valor_total_geral ? Number(values.valor_total_geral) : null,

      observacao: values.observacao || null,

      profissional_seq_ref: values.profissional_seq_ref || null,
      profissional_grau_participacao: values.profissional_grau_participacao || null,
      profissional_cpf: values.profissional_cpf || null,
      profissional_nome: values.profissional_nome || null,
      profissional_conselho_codigo: values.profissional_conselho_codigo || null,
      profissional_numero_conselho: values.profissional_numero_conselho || null,
      profissional_uf: values.profissional_uf || null,
      profissional_cbo: values.profissional_cbo || null,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("sadt_acompanhamento").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("sadt_acompanhamento").insert(payload));
    }

    setSaving(false);

    if (error) {
      showError("Não foi possível salvar a SADT: " + error.message);
    } else {
      showSuccess(isEdit ? "SADT atualizada com sucesso." : "SADT criada com sucesso.");
      navigate("/admin/sadt-acompanhamento");
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando dados da SADT...
      </div>
    );
  }

  return (
    <div className={`relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900 ${isMedicoRoute ? "pb-32" : ""}`}>

      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="sadt-acompanhamento" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/admin/sadt-acompanhamento")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                    <Activity className="h-4 w-4" />
                  </span>
                  {isEdit ? "Editar SADT" : "Nova SADT"}
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  {isEdit
                    ? "Atualize os dados do acompanhamento de SADT."
                    : "Preencha os dados para cadastrar uma nova SADT."}
                </p>
              </div>
            </div>
            <AdminHeaderActions notificationsCount={0} />
          </header>

          {/* Abas — só mostra se for edição */}
          {isEdit ? (
            <Tabs defaultValue="dados" className="flex flex-col gap-4">
              <TabsList className="w-fit rounded-full bg-slate-100 p-1">
                <TabsTrigger
                  value="dados"
                  className="rounded-full px-5 text-sm text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Dados da SADT
                </TabsTrigger>
                <TabsTrigger
                  value="documentos"
                  className="rounded-full px-5 text-sm text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
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
                  onCancel={() => navigate("/admin/sadt-acompanhamento")}
                />
              </TabsContent>

              <TabsContent value="documentos" className="mt-0">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white">
                      <FolderOpen className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-semibold text-slate-700">
                      Documentos enviados
                    </h2>
                  </div>
                  <DocumentosTab sadtId={id!} />
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
              onCancel={() => navigate("/admin/sadt-acompanhamento")}
            />
          )}
        </div>
      </div>

      {isMedicoRoute && <MedicoFloatingNav />}
    </div>
  );
};

// ── Formulário ────────────────────────────────────────────────────────────────
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
      id="sadt-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 pb-6"
    >
      {/* 1. Identificação */}
      <Section icon={Activity} color="bg-teal-600" title="Identificação da Guia SADT">
        <Field label="Registro ANS">
          <input {...register("registro_ans")} className={inputCls} placeholder="000000" />
        </Field>
        <Field label="Nº Guia Prestador">
          <input {...register("numero_guia_prestador")} className={inputCls} placeholder="Ex: 12345" />
        </Field>
        <Field label="Nº Guia SADT (Atribuído pela Operadora)">
          <input {...register("numero_guia_sadt")} className={inputCls} placeholder="Ex: 67890" />
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

      {/* 3. Solicitante */}
      <Section icon={Building2} color="bg-emerald-600" title="Solicitante">
        <Field label="Cód. Operadora (Solicitante)">
          <input {...register("solicitante_codigo_operadora")} className={inputCls} placeholder="Código" />
        </Field>
        <Field label="Nome do Solicitante" span="2">
          <input {...register("solicitante_nome")} className={inputCls} placeholder="Nome da instituição" />
        </Field>
        <Field label="CNES (Solicitante)">
          <input {...register("solicitante_cnes")} className={inputCls} placeholder="CNES" />
        </Field>
        <Field label="Profissional Solicitante" span="2">
          <input {...register("solicitante_profissional_nome")} className={inputCls} placeholder="Nome do médico solicitante" />
        </Field>
        <Field label="Conselho">
          <input {...register("solicitante_profissional_conselho_codigo")} className={inputCls} placeholder="CRM / CRO..." />
        </Field>
        <Field label="Nº Conselho">
          <input {...register("solicitante_profissional_numero_conselho")} className={inputCls} placeholder="Número" />
        </Field>
        <Field label="UF">
          <input {...register("solicitante_profissional_uf")} className={inputCls} placeholder="SP" maxLength={2} />
        </Field>
        <Field label="CBO">
          <input {...register("solicitante_profissional_cbo")} className={inputCls} placeholder="Código CBO" />
        </Field>
      </Section>

      {/* 4. Executante */}
      <Section icon={Building2} color="bg-sky-600" title="Executante">
        <Field label="Cód. Operadora (Executante)">
          <input {...register("executante_codigo_operadora")} className={inputCls} placeholder="Código" />
        </Field>
        <Field label="Nome do Executante" span="2">
          <input {...register("executante_nome")} className={inputCls} placeholder="Nome" />
        </Field>
        <Field label="CNES (Executante)">
          <input {...register("executante_cnes")} className={inputCls} placeholder="CNES" />
        </Field>
      </Section>

      {/* 5. Atendimento */}
      <Section icon={ClipboardList} color="bg-orange-500" title="Dados do Atendimento">
        <Field label="Caráter Atendimento">
          <input {...register("carater_atendimento")} className={inputCls} placeholder="Eletivo / Urgência" />
        </Field>
        <Field label="Tipo Atendimento">
          <input {...register("tipo_atendimento")} className={inputCls} placeholder="Ex: Ambulatorial" />
        </Field>
        <Field label="Indicação Acidente">
          <input {...register("indicacao_acidente")} className={inputCls} placeholder="Ex: 9 - Não acidente" />
        </Field>
        <Field label="Tipo Consulta">
          <input {...register("tipo_consulta")} className={inputCls} placeholder="Ex: Primeira / Retorno" />
        </Field>
        <Field label="Motivo Encerramento">
          <input {...register("motivo_encerramento")} className={inputCls} placeholder="Código" />
        </Field>
        <Field label="Data Solicitação">
          <input type="date" {...register("data_solicitacao")} className={inputCls} />
        </Field>
        <Field label="Indicação Clínica" span="full">
          <Textarea
            {...register("indicacao_clinica")}
            rows={2}
            placeholder="Indicação clínica do procedimento..."
            className="resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </Field>
      </Section>

      {/* 6. Profissional Executante */}
      <Section icon={Stethoscope} color="bg-indigo-600" title="Profissional Executante">
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

      {/* 7. Datas e Valores */}
      <Section icon={CalendarRange} color="bg-amber-500" title="Datas, Senha e Valores">
        <Field label="Data Autorização">
          <input type="date" {...register("data_autorizacao")} className={inputCls} />
        </Field>
        <Field label="Validade da Senha">
          <input type="date" {...register("data_validade_senha")} className={inputCls} />
        </Field>
        <Field label="Início Atendimento">
          <input type="date" {...register("data_inicio_atendimento")} className={inputCls} />
        </Field>
        <Field label="Fim Atendimento">
          <input type="date" {...register("data_fim_atendimento")} className={inputCls} />
        </Field>
        <Field label="Vlr. Procedimentos (R$)">
          <input type="number" step="0.01" min="0" {...register("valor_total_procedimentos")} className={inputCls} placeholder="0,00" />
        </Field>
        <Field label="Vlr. Taxas (R$)">
          <input type="number" step="0.01" min="0" {...register("valor_total_taxas")} className={inputCls} placeholder="0,00" />
        </Field>
        <Field label="Vlr. Materiais (R$)">
          <input type="number" step="0.01" min="0" {...register("valor_total_materiais")} className={inputCls} placeholder="0,00" />
        </Field>
        <Field label="Vlr. Medicamentos (R$)">
          <input type="number" step="0.01" min="0" {...register("valor_total_medicamentos")} className={inputCls} placeholder="0,00" />
        </Field>
        <Field label="Valor Total Geral (R$)">
          <input type="number" step="0.01" min="0" {...register("valor_total_geral")} className={inputCls} placeholder="0,00" />
        </Field>
        <Field label="Observações" span="full">
          <Textarea
            {...register("observacao")}
            rows={3}
            placeholder="Observações adicionais sobre a SADT..."
            className="resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
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
          className="gap-2 rounded-full bg-teal-600 px-6 text-white hover:bg-teal-700"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Salvar SADT"}
        </Button>
      </div>
    </form>
  );
}

export default SadtAcompanhamentoFormPage;
