import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  FileSignature,
  User,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  Users,
  HeartPulse,
  FolderOpen,
  FileIcon,
  ImageIcon,
  ExternalLink,
  Loader2,
  Save,
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
  // Identificação do paciente
  prontuario: string;
  registro: string;
  nome_social: string;
  registro_civil: string;
  cpf: string;
  matricula: string;
  data_nascimento: string;
  idade: string;
  sexo: string;
  // Internação
  convenio_plano: string;
  setor: string;
  leito: string;
  // Cirurgia
  status: string;
  tipo_cirurgia: string;
  data_inicio_procedimento: string;
  hora_inicio_procedimento: string;
  data_fim_procedimento: string;
  hora_fim_procedimento: string;
  diagnostico_pre_operatorio: string;
  diagnostico_pos_operatorio: string;
  // Descrição
  descricao_cirurgica: string;
  // Cirurgião
  cirurgiao_responsavel: string;
  cirurgiao_responsavel_crm: string;
  // Pós-operatório
  sangramento_estimado: string;
  descricao_complicacoes: string;
  observacoes_adicionais: string;
  // Orientações
  uso_antibioticos: string;
  profilaxia_tev_tvp: string;
  troca_curativo: string;
  dieta: string;
  deambulacao: string;
  previsao_alta: string;
  outras_orientacoes: string;
};

type DocItem = {
  path: string;
  signedUrl: string | null;
  fileName: string;
  isImage: boolean;
};

const defaultValues: FormValues = {
  prontuario: "", registro: "", nome_social: "", registro_civil: "",
  cpf: "", matricula: "", data_nascimento: "", idade: "", sexo: "",
  convenio_plano: "", setor: "", leito: "",
  status: "AGUARDANDO", tipo_cirurgia: "",
  data_inicio_procedimento: "", hora_inicio_procedimento: "",
  data_fim_procedimento: "", hora_fim_procedimento: "",
  diagnostico_pre_operatorio: "", diagnostico_pos_operatorio: "",
  descricao_cirurgica: "",
  cirurgiao_responsavel: "", cirurgiao_responsavel_crm: "",
  sangramento_estimado: "", descricao_complicacoes: "", observacoes_adicionais: "",
  uso_antibioticos: "", profilaxia_tev_tvp: "", troca_curativo: "",
  dieta: "", deambulacao: "", previsao_alta: "", outras_orientacoes: "",
};

const BUCKET = "NPS-pro";

// ── Helpers visuais ───────────────────────────────────────────────────────────
function Section({ icon: Icon, color, title, children }: {
  icon: React.ElementType; color: string; title: string; children: React.ReactNode;
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

function Field({ label, required, children, span }: {
  label: string; required?: boolean; children: React.ReactNode; span?: "full" | "2";
}) {
  return (
    <div className={span === "full" ? "sm:col-span-2 lg:col-span-3" : span === "2" ? "sm:col-span-2" : ""}>
      <Label className="mb-1 block text-xs font-medium text-slate-500">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

const inputCls = "h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-300 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 w-full";
const textareaCls = "resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 w-full";

// ── Aba de Documentos ─────────────────────────────────────────────────────────
function DocumentosTab({ descricaoId }: { descricaoId: string }) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);

      // 1) Busca na tabela descricoes_cirurgicas_arquivos
      const { data: arquivos } = await supabase
        .from("descricoes_cirurgicas_arquivos")
        .select("file_path")
        .eq("descricao_id", descricaoId);

      let paths: string[] = (arquivos ?? []).map((a: any) => a.file_path as string);

      // 2) Fallback: storage_folder da própria descrição
      if (paths.length === 0) {
        const { data: desc } = await supabase
          .from("descricoes_cirurgicas")
          .select("storage_folder")
          .eq("id", descricaoId)
          .single();

        if (desc?.storage_folder) {
          const { data: listData } = await supabase.storage
            .from(BUCKET)
            .list(desc.storage_folder, { limit: 100 });

          paths = (listData ?? [])
            .filter((obj) => obj.name !== ".emptyFolderPlaceholder")
            .map((obj) => `${desc.storage_folder}/${obj.name}`);
        }
      }

      if (paths.length === 0) {
        setDocs([]);
        setLoading(false);
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
  }, [descricaoId]);

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
        <p className="mt-1 text-xs text-slate-400">Os arquivos enviados via upload aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {docs.map((doc) => (
          <div key={doc.path} className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
            <div className="flex h-40 items-center justify-center overflow-hidden bg-slate-50">
              {doc.isImage && doc.signedUrl ? (
                <img src={doc.signedUrl} alt={doc.fileName} className="h-full w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <FileIcon className="h-12 w-12" />
                  <span className="text-[11px] text-slate-400">Documento</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                {doc.isImage
                  ? <ImageIcon className="h-4 w-4 flex-shrink-0 text-teal-400" />
                  : <FileIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />}
                <span className="truncate text-xs text-slate-600" title={doc.fileName}>{doc.fileName}</span>
              </div>
              {doc.signedUrl && (
                <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-teal-50 hover:text-teal-600">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {doc.isImage && doc.signedUrl && (
              <button onClick={() => setLightbox(doc.signedUrl)} className="absolute inset-0 h-40 w-full cursor-zoom-in" aria-label="Ampliar imagem" />
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Visualização" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">✕</button>
        </div>
      )}
    </>
  );
}

// ── Formulário ────────────────────────────────────────────────────────────────
function FormFields({ register, handleSubmit, onSubmit, saving, isEdit, onCancel, setValue, watch }: {
  register: ReturnType<typeof useForm<FormValues>>["register"];
  handleSubmit: ReturnType<typeof useForm<FormValues>>["handleSubmit"];
  onSubmit: (v: FormValues) => Promise<void>;
  saving: boolean; isEdit: boolean; onCancel: () => void;
  setValue: ReturnType<typeof useForm<FormValues>>["setValue"];
  watch: ReturnType<typeof useForm<FormValues>>["watch"];
}) {
  const status = watch("status");
  const sexo = watch("sexo");

  return (
    <form id="descricao-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pb-6">

      {/* 1. Identificação do Paciente */}
      <Section icon={User} color="bg-teal-600" title="Identificação do Paciente">
        <Field label="Prontuário">
          <input {...register("prontuario")} className={inputCls} placeholder="Nº prontuário" />
        </Field>
        <Field label="Registro">
          <input {...register("registro")} className={inputCls} placeholder="Nº registro" />
        </Field>
        <Field label="Matrícula">
          <input {...register("matricula")} className={inputCls} placeholder="Matrícula" />
        </Field>
        <Field label="Nome Social" span="2">
          <input {...register("nome_social")} className={inputCls} placeholder="Nome social" />
        </Field>
        <Field label="Registro Civil" span="2">
          <input {...register("registro_civil")} className={inputCls} placeholder="Nome completo (registro civil)" />
        </Field>
        <Field label="CPF">
          <input {...register("cpf")} className={inputCls} placeholder="000.000.000-00" />
        </Field>
        <Field label="Data de Nascimento">
          <input type="date" {...register("data_nascimento")} className={inputCls} />
        </Field>
        <Field label="Idade">
          <input type="number" min="0" {...register("idade")} className={inputCls} placeholder="Anos" />
        </Field>
        <Field label="Sexo">
          <Select value={sexo} onValueChange={(v) => setValue("sexo", v)}>
            <SelectTrigger className="h-9 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Masculino</SelectItem>
              <SelectItem value="F">Feminino</SelectItem>
              <SelectItem value="O">Outro</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Section>

      {/* 2. Internação */}
      <Section icon={ClipboardList} color="bg-blue-600" title="Internação">
        <Field label="Convênio / Plano" span="2">
          <input {...register("convenio_plano")} className={inputCls} placeholder="Nome do convênio" />
        </Field>
        <Field label="Setor">
          <input {...register("setor")} className={inputCls} placeholder="Setor" />
        </Field>
        <Field label="Leito">
          <input {...register("leito")} className={inputCls} placeholder="Leito" />
        </Field>
      </Section>

      {/* 3. Dados da Cirurgia */}
      <Section icon={Stethoscope} color="bg-violet-600" title="Dados da Cirurgia">
        <Field label="Status">
          <Select value={status} onValueChange={(v) => setValue("status", v)}>
            <SelectTrigger className="h-9 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
              <SelectItem value="APROVADO">Aprovado</SelectItem>
              <SelectItem value="REPROVADO">Reprovado</SelectItem>
              <SelectItem value="FATURADO">Faturado</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tipo de Cirurgia" span="2">
          <input {...register("tipo_cirurgia")} className={inputCls} placeholder="Ex: Videolaparoscopia, Aberta..." />
        </Field>
        <Field label="Data Início">
          <input type="date" {...register("data_inicio_procedimento")} className={inputCls} />
        </Field>
        <Field label="Hora Início">
          <input type="time" {...register("hora_inicio_procedimento")} className={inputCls} />
        </Field>
        <Field label="Data Fim">
          <input type="date" {...register("data_fim_procedimento")} className={inputCls} />
        </Field>
        <Field label="Hora Fim">
          <input type="time" {...register("hora_fim_procedimento")} className={inputCls} />
        </Field>
        <Field label="Diagnóstico Pré-operatório" span="full">
          <Textarea {...register("diagnostico_pre_operatorio")} rows={2} placeholder="Diagnóstico pré-operatório..." className={textareaCls} />
        </Field>
        <Field label="Diagnóstico Pós-operatório" span="full">
          <Textarea {...register("diagnostico_pos_operatorio")} rows={2} placeholder="Diagnóstico pós-operatório..." className={textareaCls} />
        </Field>
      </Section>

      {/* 4. Descrição Cirúrgica */}
      <Section icon={FileSignature} color="bg-amber-500" title="Descrição Cirúrgica">
        <Field label="Texto da Descrição" span="full">
          <Textarea {...register("descricao_cirurgica")} rows={8} placeholder="Descreva detalhadamente o procedimento cirúrgico realizado..." className={textareaCls} />
        </Field>
      </Section>

      {/* 5. Cirurgião Responsável */}
      <Section icon={Users} color="bg-sky-600" title="Cirurgião Responsável">
        <Field label="Nome do Cirurgião" span="2">
          <input {...register("cirurgiao_responsavel")} className={inputCls} placeholder="Nome completo" />
        </Field>
        <Field label="CRM">
          <input {...register("cirurgiao_responsavel_crm")} className={inputCls} placeholder="Número CRM" />
        </Field>
      </Section>

      {/* 6. Pós-operatório */}
      <Section icon={HeartPulse} color="bg-rose-500" title="Pós-operatório e Complicações">
        <Field label="Sangramento Estimado">
          <input {...register("sangramento_estimado")} className={inputCls} placeholder="Ex: 200ml" />
        </Field>
        <Field label="Descrição de Complicações" span="2">
          <input {...register("descricao_complicacoes")} className={inputCls} placeholder="Se houver complicações..." />
        </Field>
        <Field label="Observações Adicionais" span="full">
          <Textarea {...register("observacoes_adicionais")} rows={3} placeholder="Observações adicionais..." className={textareaCls} />
        </Field>
      </Section>

      {/* 7. Orientações Pós-alta */}
      <Section icon={FlaskConical} color="bg-emerald-600" title="Orientações Pós-alta">
        <Field label="Uso de Antibióticos">
          <input {...register("uso_antibioticos")} className={inputCls} placeholder="Sim / Não / Qual..." />
        </Field>
        <Field label="Profilaxia TEV/TVP">
          <input {...register("profilaxia_tev_tvp")} className={inputCls} placeholder="Sim / Não / Qual..." />
        </Field>
        <Field label="Troca de Curativo">
          <input {...register("troca_curativo")} className={inputCls} placeholder="Frequência..." />
        </Field>
        <Field label="Dieta">
          <input {...register("dieta")} className={inputCls} placeholder="Ex: Livre, Leve..." />
        </Field>
        <Field label="Deambulação">
          <input {...register("deambulacao")} className={inputCls} placeholder="Ex: Livre, Restrita..." />
        </Field>
        <Field label="Previsão de Alta">
          <input {...register("previsao_alta")} className={inputCls} placeholder="Ex: 24h, 48h..." />
        </Field>
        <Field label="Outras Orientações" span="full">
          <Textarea {...register("outras_orientacoes")} rows={3} placeholder="Outras orientações ao paciente..." className={textareaCls} />
        </Field>
      </Section>

      {/* Rodapé */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}
          className="rounded-full border-slate-300 bg-white px-6 text-slate-700 hover:bg-slate-50">
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}
          className="gap-2 rounded-full bg-teal-600 px-6 text-white hover:bg-teal-700">
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Salvar Descrição"}
        </Button>
      </div>
    </form>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const DescricaoCirurgicaAdminFormPage: React.FC = () => {
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
        .from("descricoes_cirurgicas")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        showError("Não foi possível carregar a descrição.");
        navigate("/admin/descricao-cirurgica");
        return;
      }

      reset({
        prontuario: data.prontuario ?? "",
        registro: data.registro ?? "",
        nome_social: data.nome_social ?? "",
        registro_civil: data.registro_civil ?? "",
        cpf: data.cpf ?? "",
        matricula: data.matricula ?? "",
        data_nascimento: data.data_nascimento ?? "",
        idade: data.idade != null ? String(data.idade) : "",
        sexo: data.sexo ?? "",
        convenio_plano: data.convenio_plano ?? "",
        setor: data.setor ?? "",
        leito: data.leito ?? "",
        status: data.status ?? "AGUARDANDO",
        tipo_cirurgia: data.tipo_cirurgia ?? "",
        data_inicio_procedimento: data.data_inicio_procedimento ?? "",
        hora_inicio_procedimento: data.hora_inicio_procedimento
          ? String(data.hora_inicio_procedimento).slice(0, 5)
          : "",
        data_fim_procedimento: data.data_fim_procedimento ?? "",
        hora_fim_procedimento: data.hora_fim_procedimento
          ? String(data.hora_fim_procedimento).slice(0, 5)
          : "",
        diagnostico_pre_operatorio: data.diagnostico_pre_operatorio ?? "",
        diagnostico_pos_operatorio: data.diagnostico_pos_operatorio ?? "",
        descricao_cirurgica: data.descricao_cirurgica ?? "",
        cirurgiao_responsavel: data.cirurgiao_responsavel ?? "",
        cirurgiao_responsavel_crm: data.cirurgiao_responsavel_crm ?? "",
        sangramento_estimado: data.sangramento_estimado ?? "",
        descricao_complicacoes: data.descricao_complicacoes ?? "",
        observacoes_adicionais: data.observacoes_adicionais ?? "",
        uso_antibioticos: data.uso_antibioticos ?? "",
        profilaxia_tev_tvp: data.profilaxia_tev_tvp ?? "",
        troca_curativo: data.troca_curativo ?? "",
        dieta: data.dieta ?? "",
        deambulacao: data.deambulacao ?? "",
        previsao_alta: data.previsao_alta ?? "",
        outras_orientacoes: data.outras_orientacoes ?? "",
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
      user_id: user.id,
      prontuario: values.prontuario || null,
      registro: values.registro || null,
      nome_social: values.nome_social || null,
      registro_civil: values.registro_civil || null,
      cpf: values.cpf || null,
      matricula: values.matricula || null,
      data_nascimento: values.data_nascimento || null,
      idade: values.idade ? Number(values.idade) : null,
      sexo: values.sexo || null,
      convenio_plano: values.convenio_plano || null,
      setor: values.setor || null,
      leito: values.leito || null,
      status: values.status || "AGUARDANDO",
      tipo_cirurgia: values.tipo_cirurgia || null,
      data_inicio_procedimento: values.data_inicio_procedimento || null,
      hora_inicio_procedimento: values.hora_inicio_procedimento || null,
      data_fim_procedimento: values.data_fim_procedimento || null,
      hora_fim_procedimento: values.hora_fim_procedimento || null,
      diagnostico_pre_operatorio: values.diagnostico_pre_operatorio || null,
      diagnostico_pos_operatorio: values.diagnostico_pos_operatorio || null,
      descricao_cirurgica: values.descricao_cirurgica || null,
      cirurgiao_responsavel: values.cirurgiao_responsavel || null,
      cirurgiao_responsavel_crm: values.cirurgiao_responsavel_crm || null,
      sangramento_estimado: values.sangramento_estimado || null,
      descricao_complicacoes: values.descricao_complicacoes || null,
      observacoes_adicionais: values.observacoes_adicionais || null,
      uso_antibioticos: values.uso_antibioticos || null,
      profilaxia_tev_tvp: values.profilaxia_tev_tvp || null,
      troca_curativo: values.troca_curativo || null,
      dieta: values.dieta || null,
      deambulacao: values.deambulacao || null,
      previsao_alta: values.previsao_alta || null,
      outras_orientacoes: values.outras_orientacoes || null,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("descricoes_cirurgicas").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("descricoes_cirurgicas").insert(payload));
    }

    setSaving(false);

    if (error) {
      showError("Não foi possível salvar: " + error.message);
    } else {
      showSuccess(isEdit ? "Descrição atualizada com sucesso." : "Descrição criada com sucesso.");
      navigate("/admin/descricao-cirurgica");
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando dados da descrição...
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="descricao-cirurgica" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/admin/descricao-cirurgica")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                    <FileSignature className="h-4 w-4" />
                  </span>
                  {isEdit ? "Editar Descrição Cirúrgica" : "Nova Descrição Cirúrgica"}
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  {isEdit ? "Atualize os dados da descrição cirúrgica." : "Preencha os dados para cadastrar uma nova descrição cirúrgica."}
                </p>
              </div>
            </div>
            <AdminHeaderActions notificationsCount={0} />
          </header>

          {/* Abas — só na edição */}
          {isEdit ? (
            <Tabs defaultValue="dados" className="flex flex-col gap-4">
              <TabsList className="w-fit rounded-full bg-slate-100 p-1">
                <TabsTrigger value="dados"
                  className="rounded-full px-5 text-sm text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                  <FileSignature className="mr-2 h-4 w-4" />
                  Dados
                </TabsTrigger>
                <TabsTrigger value="documentos"
                  className="rounded-full px-5 text-sm text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Documentos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="mt-0">
                <FormFields register={register} handleSubmit={handleSubmit} onSubmit={onSubmit}
                  saving={saving} isEdit={isEdit} onCancel={() => navigate("/admin/descricao-cirurgica")}
                  setValue={setValue} watch={watch} />
              </TabsContent>

              <TabsContent value="documentos" className="mt-0">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white">
                      <FolderOpen className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-semibold text-slate-700">Documentos enviados</h2>
                  </div>
                  <DocumentosTab descricaoId={id!} />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <FormFields register={register} handleSubmit={handleSubmit} onSubmit={onSubmit}
              saving={saving} isEdit={isEdit} onCancel={() => navigate("/admin/descricao-cirurgica")}
              setValue={setValue} watch={watch} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DescricaoCirurgicaAdminFormPage;
