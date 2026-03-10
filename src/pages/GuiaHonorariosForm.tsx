import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Receipt,
  User,
  Stethoscope,
  ClipboardList,
  Users,
  Save,
  FolderOpen,
  FileIcon,
  ImageIcon,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type FormValues = {
  // Profissional
  profissional_nome: string;
  profissional_cod_sist: string;
  profissional_crm: string;
  // Paciente
  paciente_registro: string;
  paciente_nome: string;
  paciente_leito: string;
  // Dados gerais
  data: string;
  hora: string;
  convenio: string;
  // Procedimentos cirúrgicos (1-5)
  proc_cir_1_descricao: string;
  proc_cir_1_cod_sistema: string;
  proc_cir_1_amb_cbhpm: string;
  proc_cir_1_via_acesso: string;
  proc_cir_2_descricao: string;
  proc_cir_2_cod_sistema: string;
  proc_cir_2_amb_cbhpm: string;
  proc_cir_2_via_acesso: string;
  proc_cir_3_descricao: string;
  proc_cir_3_cod_sistema: string;
  proc_cir_3_amb_cbhpm: string;
  proc_cir_3_via_acesso: string;
  proc_cir_4_descricao: string;
  proc_cir_4_cod_sistema: string;
  proc_cir_4_amb_cbhpm: string;
  proc_cir_4_via_acesso: string;
  proc_cir_5_descricao: string;
  proc_cir_5_cod_sistema: string;
  proc_cir_5_amb_cbhpm: string;
  proc_cir_5_via_acesso: string;
  // Equipe cirúrgica
  equipe_cirurgiao_medico: string;
  equipe_cirurgiao_cod_sist: string;
  equipe_cirurgiao_cpf: string;
  equipe_cirurgiao_crm: string;
  equipe_aux1_medico: string;
  equipe_aux1_cod_sist: string;
  equipe_aux1_cpf: string;
  equipe_aux1_crm: string;
  equipe_aux2_medico: string;
  equipe_aux2_cod_sist: string;
  equipe_aux2_cpf: string;
  equipe_aux2_crm: string;
  equipe_aux3_medico: string;
  equipe_aux3_cod_sist: string;
  equipe_aux3_cpf: string;
  equipe_aux3_crm: string;
  equipe_anestesista_medico: string;
  equipe_anestesista_cod_sist: string;
  equipe_anestesista_cpf: string;
  equipe_anestesista_crm: string;
  equipe_instrumentador_medico: string;
  equipe_instrumentador_cod_sist: string;
  equipe_instrumentador_cpf: string;
  equipe_instrumentador_crm: string;
  equipe_perfusionista_medico: string;
  equipe_perfusionista_cod_sist: string;
  equipe_perfusionista_cpf: string;
  equipe_perfusionista_crm: string;
  // Procedimentos médicos
  proc_med_visita_cod_sistema: string;
  proc_med_visita_qtd: string;
  proc_med_parecer_cod_sistema: string;
  proc_med_parecer_qtd: string;
  proc_med_outros_cod_sistema: string;
  proc_med_outros_amb_cbhpm: string;
  proc_med_outros_qtd: string;
  proc_med_extra1_desc: string;
  proc_med_extra1_cod_sistema: string;
  proc_med_extra1_amb_cbhpm: string;
  proc_med_extra1_qtd: string;
  proc_med_extra2_desc: string;
  proc_med_extra2_cod_sistema: string;
  proc_med_extra2_amb_cbhpm: string;
  proc_med_extra2_qtd: string;
};

type DocItem = {
  path: string;
  signedUrl: string | null;
  fileName: string;
  isImage: boolean;
  isPdf: boolean;
};

const defaultValues: FormValues = {
  profissional_nome: "",
  profissional_cod_sist: "",
  profissional_crm: "",
  paciente_registro: "",
  paciente_nome: "",
  paciente_leito: "",
  data: "",
  hora: "",
  convenio: "",
  proc_cir_1_descricao: "",
  proc_cir_1_cod_sistema: "",
  proc_cir_1_amb_cbhpm: "",
  proc_cir_1_via_acesso: "",
  proc_cir_2_descricao: "",
  proc_cir_2_cod_sistema: "",
  proc_cir_2_amb_cbhpm: "",
  proc_cir_2_via_acesso: "",
  proc_cir_3_descricao: "",
  proc_cir_3_cod_sistema: "",
  proc_cir_3_amb_cbhpm: "",
  proc_cir_3_via_acesso: "",
  proc_cir_4_descricao: "",
  proc_cir_4_cod_sistema: "",
  proc_cir_4_amb_cbhpm: "",
  proc_cir_4_via_acesso: "",
  proc_cir_5_descricao: "",
  proc_cir_5_cod_sistema: "",
  proc_cir_5_amb_cbhpm: "",
  proc_cir_5_via_acesso: "",
  equipe_cirurgiao_medico: "",
  equipe_cirurgiao_cod_sist: "",
  equipe_cirurgiao_cpf: "",
  equipe_cirurgiao_crm: "",
  equipe_aux1_medico: "",
  equipe_aux1_cod_sist: "",
  equipe_aux1_cpf: "",
  equipe_aux1_crm: "",
  equipe_aux2_medico: "",
  equipe_aux2_cod_sist: "",
  equipe_aux2_cpf: "",
  equipe_aux2_crm: "",
  equipe_aux3_medico: "",
  equipe_aux3_cod_sist: "",
  equipe_aux3_cpf: "",
  equipe_aux3_crm: "",
  equipe_anestesista_medico: "",
  equipe_anestesista_cod_sist: "",
  equipe_anestesista_cpf: "",
  equipe_anestesista_crm: "",
  equipe_instrumentador_medico: "",
  equipe_instrumentador_cod_sist: "",
  equipe_instrumentador_cpf: "",
  equipe_instrumentador_crm: "",
  equipe_perfusionista_medico: "",
  equipe_perfusionista_cod_sist: "",
  equipe_perfusionista_cpf: "",
  equipe_perfusionista_crm: "",
  proc_med_visita_cod_sistema: "",
  proc_med_visita_qtd: "",
  proc_med_parecer_cod_sistema: "",
  proc_med_parecer_qtd: "",
  proc_med_outros_cod_sistema: "",
  proc_med_outros_amb_cbhpm: "",
  proc_med_outros_qtd: "",
  proc_med_extra1_desc: "",
  proc_med_extra1_cod_sistema: "",
  proc_med_extra1_amb_cbhpm: "",
  proc_med_extra1_qtd: "",
  proc_med_extra2_desc: "",
  proc_med_extra2_cod_sistema: "",
  proc_med_extra2_amb_cbhpm: "",
  proc_med_extra2_qtd: "",
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
  "h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full";

// ── Aba de Documentos ─────────────────────────────────────────────────────────
function DocumentosTab({ guiaId }: { guiaId: string }) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("guia_honorarios")
        .select("pdf_guia_honorario")
        .eq("id", guiaId)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const rawPdf = data.pdf_guia_honorario;
      const paths: string[] = rawPdf
        ? Array.isArray(rawPdf)
          ? (rawPdf as string[])
          : [rawPdf as string]
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
          const isPdf = /\.pdf$/i.test(path);

          return { path, signedUrl: signed?.signedUrl ?? null, fileName, isImage, isPdf };
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
              ) : doc.isPdf && doc.signedUrl ? (
                <iframe
                  src={doc.signedUrl}
                  title={doc.fileName}
                  className="h-full w-full border-0 pointer-events-none"
                  scrolling="no"
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
                  <ImageIcon className="h-4 w-4 flex-shrink-0 text-emerald-400" />
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
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
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

            {/* Clique para abrir PDF em nova aba */}
            {doc.isPdf && doc.signedUrl && (
              <a
                href={doc.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 h-40 w-full cursor-pointer"
                aria-label="Abrir PDF"
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
      id="guia-honorarios-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 pb-6"
    >
      {/* 1. Profissional */}
      <Section icon={Stethoscope} color="bg-emerald-600" title="Profissional">
        <Field label="Nome do Profissional" span="2">
          <input {...register("profissional_nome")} className={inputCls} placeholder="Nome completo" />
        </Field>
        <Field label="Cód. Sistema">
          <input {...register("profissional_cod_sist")} className={inputCls} placeholder="Código" />
        </Field>
        <Field label="CRM">
          <input {...register("profissional_crm")} className={inputCls} placeholder="Número CRM" />
        </Field>
      </Section>

      {/* 2. Paciente */}
      <Section icon={User} color="bg-blue-600" title="Paciente">
        <Field label="Registro">
          <input {...register("paciente_registro")} className={inputCls} placeholder="Nº registro" />
        </Field>
        <Field label="Nome do Paciente" span="2">
          <input {...register("paciente_nome")} className={inputCls} placeholder="Nome completo" />
        </Field>
        <Field label="Leito">
          <input {...register("paciente_leito")} className={inputCls} placeholder="Ex: 101-A" />
        </Field>
        <Field label="Data">
          <input type="date" {...register("data")} className={inputCls} />
        </Field>
        <Field label="Hora">
          <input type="time" {...register("hora")} className={inputCls} />
        </Field>
        <Field label="Convênio">
          <input {...register("convenio")} className={inputCls} placeholder="Nome do convênio" />
        </Field>
      </Section>

      {/* 3. Procedimentos Cirúrgicos */}
      <Section icon={ClipboardList} color="bg-violet-600" title="Procedimentos Cirúrgicos">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <div key={n} className="sm:col-span-2 lg:col-span-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Procedimento {n}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <Label className="mb-1 block text-xs font-medium text-slate-500">Descrição</Label>
                <input
                  {...register(`proc_cir_${n}_descricao` as keyof FormValues)}
                  className={inputCls}
                  placeholder="Descrição do procedimento"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium text-slate-500">Cód. Sistema</Label>
                <input
                  {...register(`proc_cir_${n}_cod_sistema` as keyof FormValues)}
                  className={inputCls}
                  placeholder="Código"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium text-slate-500">AMB/CBHPM</Label>
                <input
                  {...register(`proc_cir_${n}_amb_cbhpm` as keyof FormValues)}
                  className={inputCls}
                  placeholder="AMB/CBHPM"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium text-slate-500">Via de Acesso</Label>
                <input
                  {...register(`proc_cir_${n}_via_acesso` as keyof FormValues)}
                  className={inputCls}
                  placeholder="Via de acesso"
                />
              </div>
            </div>
          </div>
        ))}
      </Section>

      {/* 4. Equipe Cirúrgica */}
      <Section icon={Users} color="bg-sky-600" title="Equipe Cirúrgica">
        {[
          { label: "Cirurgião", prefix: "equipe_cirurgiao" },
          { label: "Auxiliar 1", prefix: "equipe_aux1" },
          { label: "Auxiliar 2", prefix: "equipe_aux2" },
          { label: "Auxiliar 3", prefix: "equipe_aux3" },
          { label: "Anestesista", prefix: "equipe_anestesista" },
          { label: "Instrumentador", prefix: "equipe_instrumentador" },
        ].map(({ label, prefix }) => (
          <div key={prefix} className="sm:col-span-2 lg:col-span-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <Label className="mb-1 block text-xs font-medium text-slate-500">Médico</Label>
                <input
                  {...register(`${prefix}_medico` as keyof FormValues)}
                  className={inputCls}
                  placeholder="Nome"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium text-slate-500">Cód. Sistema</Label>
                <input
                  {...register(`${prefix}_cod_sist` as keyof FormValues)}
                  className={inputCls}
                  placeholder="Código"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium text-slate-500">CPF</Label>
                <input
                  {...register(`${prefix}_cpf` as keyof FormValues)}
                  className={inputCls}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium text-slate-500">CRM</Label>
                <input
                  {...register(`${prefix}_crm` as keyof FormValues)}
                  className={inputCls}
                  placeholder="Número CRM"
                />
              </div>
            </div>
          </div>
        ))}
      </Section>

      {/* 5. Procedimentos Médicos */}
      <Section icon={Receipt} color="bg-amber-500" title="Procedimentos Médicos">
        <Field label="Visita — Cód. Sistema">
          <input {...register("proc_med_visita_cod_sistema")} className={inputCls} placeholder="Código" />
        </Field>
        <Field label="Visita — Qtd.">
          <input type="number" min="0" {...register("proc_med_visita_qtd")} className={inputCls} placeholder="0" />
        </Field>
        <Field label="Parecer — Cód. Sistema">
          <input {...register("proc_med_parecer_cod_sistema")} className={inputCls} placeholder="Código" />
        </Field>
        <Field label="Parecer — Qtd.">
          <input type="number" min="0" {...register("proc_med_parecer_qtd")} className={inputCls} placeholder="0" />
        </Field>
        <Field label="Outros — Cód. Sistema">
          <input {...register("proc_med_outros_cod_sistema")} className={inputCls} placeholder="Código" />
        </Field>
        <Field label="Outros — AMB/CBHPM">
          <input {...register("proc_med_outros_amb_cbhpm")} className={inputCls} placeholder="AMB/CBHPM" />
        </Field>
        <Field label="Outros — Qtd.">
          <input type="number" min="0" {...register("proc_med_outros_qtd")} className={inputCls} placeholder="0" />
        </Field>

        {/* Extra 1 */}
        <div className="sm:col-span-2 lg:col-span-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Extra 1</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Label className="mb-1 block text-xs font-medium text-slate-500">Descrição</Label>
              <input {...register("proc_med_extra1_desc")} className={inputCls} placeholder="Descrição" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">Cód. Sistema</Label>
              <input {...register("proc_med_extra1_cod_sistema")} className={inputCls} placeholder="Código" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">AMB/CBHPM</Label>
              <input {...register("proc_med_extra1_amb_cbhpm")} className={inputCls} placeholder="AMB/CBHPM" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">Qtd.</Label>
              <input type="number" min="0" {...register("proc_med_extra1_qtd")} className={inputCls} placeholder="0" />
            </div>
          </div>
        </div>

        {/* Extra 2 */}
        <div className="sm:col-span-2 lg:col-span-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Extra 2</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Label className="mb-1 block text-xs font-medium text-slate-500">Descrição</Label>
              <input {...register("proc_med_extra2_desc")} className={inputCls} placeholder="Descrição" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">Cód. Sistema</Label>
              <input {...register("proc_med_extra2_cod_sistema")} className={inputCls} placeholder="Código" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">AMB/CBHPM</Label>
              <input {...register("proc_med_extra2_amb_cbhpm")} className={inputCls} placeholder="AMB/CBHPM" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">Qtd.</Label>
              <input type="number" min="0" {...register("proc_med_extra2_qtd")} className={inputCls} placeholder="0" />
            </div>
          </div>
        </div>
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
          className="gap-2 rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Salvar Guia"}
        </Button>
      </div>
    </form>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const GuiaHonorariosFormPage: React.FC = () => {
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
      const { data, error } = await supabase
        .from("guia_honorarios")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        showError("Não foi possível carregar a guia.");
        navigate("/admin/guia-honorarios");
        return;
      }

      const str = (v: unknown) => (v != null ? String(v) : "");

      reset({
        profissional_nome: str(data.profissional_nome),
        profissional_cod_sist: str(data.profissional_cod_sist),
        profissional_crm: str(data.profissional_crm),
        paciente_registro: str(data.paciente_registro),
        paciente_nome: str(data.paciente_nome),
        paciente_leito: str(data.paciente_leito),
        data: str(data.data),
        hora: str(data.hora),
        convenio: str(data.convenio),
        proc_cir_1_descricao: str(data.proc_cir_1_descricao),
        proc_cir_1_cod_sistema: str(data.proc_cir_1_cod_sistema),
        proc_cir_1_amb_cbhpm: str(data.proc_cir_1_amb_cbhpm),
        proc_cir_1_via_acesso: str(data.proc_cir_1_via_acesso),
        proc_cir_2_descricao: str(data.proc_cir_2_descricao),
        proc_cir_2_cod_sistema: str(data.proc_cir_2_cod_sistema),
        proc_cir_2_amb_cbhpm: str(data.proc_cir_2_amb_cbhpm),
        proc_cir_2_via_acesso: str(data.proc_cir_2_via_acesso),
        proc_cir_3_descricao: str(data.proc_cir_3_descricao),
        proc_cir_3_cod_sistema: str(data.proc_cir_3_cod_sistema),
        proc_cir_3_amb_cbhpm: str(data.proc_cir_3_amb_cbhpm),
        proc_cir_3_via_acesso: str(data.proc_cir_3_via_acesso),
        proc_cir_4_descricao: str(data.proc_cir_4_descricao),
        proc_cir_4_cod_sistema: str(data.proc_cir_4_cod_sistema),
        proc_cir_4_amb_cbhpm: str(data.proc_cir_4_amb_cbhpm),
        proc_cir_4_via_acesso: str(data.proc_cir_4_via_acesso),
        proc_cir_5_descricao: str(data.proc_cir_5_descricao),
        proc_cir_5_cod_sistema: str(data.proc_cir_5_cod_sistema),
        proc_cir_5_amb_cbhpm: str(data.proc_cir_5_amb_cbhpm),
        proc_cir_5_via_acesso: str(data.proc_cir_5_via_acesso),
        equipe_cirurgiao_medico: str(data.equipe_cirurgiao_medico),
        equipe_cirurgiao_cod_sist: str(data.equipe_cirurgiao_cod_sist),
        equipe_cirurgiao_cpf: str(data.equipe_cirurgiao_cpf),
        equipe_cirurgiao_crm: str(data.equipe_cirurgiao_crm),
        equipe_aux1_medico: str(data.equipe_aux1_medico),
        equipe_aux1_cod_sist: str(data.equipe_aux1_cod_sist),
        equipe_aux1_cpf: str(data.equipe_aux1_cpf),
        equipe_aux1_crm: str(data.equipe_aux1_crm),
        equipe_aux2_medico: str(data.equipe_aux2_medico),
        equipe_aux2_cod_sist: str(data.equipe_aux2_cod_sist),
        equipe_aux2_cpf: str(data.equipe_aux2_cpf),
        equipe_aux2_crm: str(data.equipe_aux2_crm),
        equipe_aux3_medico: str(data.equipe_aux3_medico),
        equipe_aux3_cod_sist: str(data.equipe_aux3_cod_sist),
        equipe_aux3_cpf: str(data.equipe_aux3_cpf),
        equipe_aux3_crm: str(data.equipe_aux3_crm),
        equipe_anestesista_medico: str(data.equipe_anestesista_medico),
        equipe_anestesista_cod_sist: str(data.equipe_anestesista_cod_sist),
        equipe_anestesista_cpf: str(data.equipe_anestesista_cpf),
        equipe_anestesista_crm: str(data.equipe_anestesista_crm),
        equipe_instrumentador_medico: str(data.equipe_instrumentador_medico),
        equipe_instrumentador_cod_sist: str(data.equipe_instrumentador_cod_sist),
        equipe_instrumentador_cpf: str(data.equipe_instrumentador_cpf),
        equipe_instrumentador_crm: str(data.equipe_instrumentador_crm),
        equipe_perfusionista_medico: str(data.equipe_perfusionista_medico),
        equipe_perfusionista_cod_sist: str(data.equipe_perfusionista_cod_sist),
        equipe_perfusionista_cpf: str(data.equipe_perfusionista_cpf),
        equipe_perfusionista_crm: str(data.equipe_perfusionista_crm),
        proc_med_visita_cod_sistema: str(data.proc_med_visita_cod_sistema),
        proc_med_visita_qtd: str(data.proc_med_visita_qtd),
        proc_med_parecer_cod_sistema: str(data.proc_med_parecer_cod_sistema),
        proc_med_parecer_qtd: str(data.proc_med_parecer_qtd),
        proc_med_outros_cod_sistema: str(data.proc_med_outros_cod_sistema),
        proc_med_outros_amb_cbhpm: str(data.proc_med_outros_amb_cbhpm),
        proc_med_outros_qtd: str(data.proc_med_outros_qtd),
        proc_med_extra1_desc: str(data.proc_med_extra1_desc),
        proc_med_extra1_cod_sistema: str(data.proc_med_extra1_cod_sistema),
        proc_med_extra1_amb_cbhpm: str(data.proc_med_extra1_amb_cbhpm),
        proc_med_extra1_qtd: str(data.proc_med_extra1_qtd),
        proc_med_extra2_desc: str(data.proc_med_extra2_desc),
        proc_med_extra2_cod_sistema: str(data.proc_med_extra2_cod_sistema),
        proc_med_extra2_amb_cbhpm: str(data.proc_med_extra2_amb_cbhpm),
        proc_med_extra2_qtd: str(data.proc_med_extra2_qtd),
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

    const n = (v: string) => (v ? v : null);

    const payload = {
      medico_id: user.id,
      profissional_nome: n(values.profissional_nome),
      profissional_cod_sist: n(values.profissional_cod_sist),
      profissional_crm: n(values.profissional_crm),
      paciente_registro: n(values.paciente_registro),
      paciente_nome: n(values.paciente_nome),
      paciente_leito: n(values.paciente_leito),
      data: n(values.data),
      hora: n(values.hora),
      convenio: n(values.convenio),
      proc_cir_1_descricao: n(values.proc_cir_1_descricao),
      proc_cir_1_cod_sistema: n(values.proc_cir_1_cod_sistema),
      proc_cir_1_amb_cbhpm: n(values.proc_cir_1_amb_cbhpm),
      proc_cir_1_via_acesso: n(values.proc_cir_1_via_acesso),
      proc_cir_2_descricao: n(values.proc_cir_2_descricao),
      proc_cir_2_cod_sistema: n(values.proc_cir_2_cod_sistema),
      proc_cir_2_amb_cbhpm: n(values.proc_cir_2_amb_cbhpm),
      proc_cir_2_via_acesso: n(values.proc_cir_2_via_acesso),
      proc_cir_3_descricao: n(values.proc_cir_3_descricao),
      proc_cir_3_cod_sistema: n(values.proc_cir_3_cod_sistema),
      proc_cir_3_amb_cbhpm: n(values.proc_cir_3_amb_cbhpm),
      proc_cir_3_via_acesso: n(values.proc_cir_3_via_acesso),
      proc_cir_4_descricao: n(values.proc_cir_4_descricao),
      proc_cir_4_cod_sistema: n(values.proc_cir_4_cod_sistema),
      proc_cir_4_amb_cbhpm: n(values.proc_cir_4_amb_cbhpm),
      proc_cir_4_via_acesso: n(values.proc_cir_4_via_acesso),
      proc_cir_5_descricao: n(values.proc_cir_5_descricao),
      proc_cir_5_cod_sistema: n(values.proc_cir_5_cod_sistema),
      proc_cir_5_amb_cbhpm: n(values.proc_cir_5_amb_cbhpm),
      proc_cir_5_via_acesso: n(values.proc_cir_5_via_acesso),
      equipe_cirurgiao_medico: n(values.equipe_cirurgiao_medico),
      equipe_cirurgiao_cod_sist: n(values.equipe_cirurgiao_cod_sist),
      equipe_cirurgiao_cpf: n(values.equipe_cirurgiao_cpf),
      equipe_cirurgiao_crm: n(values.equipe_cirurgiao_crm),
      equipe_aux1_medico: n(values.equipe_aux1_medico),
      equipe_aux1_cod_sist: n(values.equipe_aux1_cod_sist),
      equipe_aux1_cpf: n(values.equipe_aux1_cpf),
      equipe_aux1_crm: n(values.equipe_aux1_crm),
      equipe_aux2_medico: n(values.equipe_aux2_medico),
      equipe_aux2_cod_sist: n(values.equipe_aux2_cod_sist),
      equipe_aux2_cpf: n(values.equipe_aux2_cpf),
      equipe_aux2_crm: n(values.equipe_aux2_crm),
      equipe_aux3_medico: n(values.equipe_aux3_medico),
      equipe_aux3_cod_sist: n(values.equipe_aux3_cod_sist),
      equipe_aux3_cpf: n(values.equipe_aux3_cpf),
      equipe_aux3_crm: n(values.equipe_aux3_crm),
      equipe_anestesista_medico: n(values.equipe_anestesista_medico),
      equipe_anestesista_cod_sist: n(values.equipe_anestesista_cod_sist),
      equipe_anestesista_cpf: n(values.equipe_anestesista_cpf),
      equipe_anestesista_crm: n(values.equipe_anestesista_crm),
      equipe_instrumentador_medico: n(values.equipe_instrumentador_medico),
      equipe_instrumentador_cod_sist: n(values.equipe_instrumentador_cod_sist),
      equipe_instrumentador_cpf: n(values.equipe_instrumentador_cpf),
      equipe_instrumentador_crm: n(values.equipe_instrumentador_crm),
      equipe_perfusionista_medico: n(values.equipe_perfusionista_medico),
      equipe_perfusionista_cod_sist: n(values.equipe_perfusionista_cod_sist),
      equipe_perfusionista_cpf: n(values.equipe_perfusionista_cpf),
      equipe_perfusionista_crm: n(values.equipe_perfusionista_crm),
      proc_med_visita_cod_sistema: n(values.proc_med_visita_cod_sistema),
      proc_med_visita_qtd: n(values.proc_med_visita_qtd),
      proc_med_parecer_cod_sistema: n(values.proc_med_parecer_cod_sistema),
      proc_med_parecer_qtd: n(values.proc_med_parecer_qtd),
      proc_med_outros_cod_sistema: n(values.proc_med_outros_cod_sistema),
      proc_med_outros_amb_cbhpm: n(values.proc_med_outros_amb_cbhpm),
      proc_med_outros_qtd: n(values.proc_med_outros_qtd),
      proc_med_extra1_desc: n(values.proc_med_extra1_desc),
      proc_med_extra1_cod_sistema: n(values.proc_med_extra1_cod_sistema),
      proc_med_extra1_amb_cbhpm: n(values.proc_med_extra1_amb_cbhpm),
      proc_med_extra1_qtd: n(values.proc_med_extra1_qtd),
      proc_med_extra2_desc: n(values.proc_med_extra2_desc),
      proc_med_extra2_cod_sistema: n(values.proc_med_extra2_cod_sistema),
      proc_med_extra2_amb_cbhpm: n(values.proc_med_extra2_amb_cbhpm),
      proc_med_extra2_qtd: n(values.proc_med_extra2_qtd),
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("guia_honorarios").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("guia_honorarios").insert(payload));
    }

    setSaving(false);

    if (error) {
      showError("Não foi possível salvar a guia: " + error.message);
    } else {
      showSuccess(isEdit ? "Guia atualizada com sucesso." : "Guia criada com sucesso.");
      navigate("/admin/guia-honorarios");
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
        <AdminSidebar documentosSubsection="guia-honorarios" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/admin/guia-honorarios")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Receipt className="h-4 w-4" />
                  </span>
                  {isEdit ? "Editar Guia de Honorários" : "Nova Guia de Honorários"}
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  {isEdit
                    ? "Atualize os dados da guia de honorários."
                    : "Preencha os dados para cadastrar uma nova guia de honorários."}
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
                  className="rounded-full px-5 text-sm text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  <Receipt className="mr-2 h-4 w-4" />
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

              <TabsContent value="dados" className="mt-0">
                <FormFields
                  register={register}
                  handleSubmit={handleSubmit}
                  onSubmit={onSubmit}
                  saving={saving}
                  isEdit={isEdit}
                  onCancel={() => navigate("/admin/guia-honorarios")}
                />
              </TabsContent>

              <TabsContent value="documentos" className="mt-0">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                      <FolderOpen className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-semibold text-slate-700">Documentos enviados</h2>
                  </div>
                  <DocumentosTab guiaId={id!} />
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
              onCancel={() => navigate("/admin/guia-honorarios")}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GuiaHonorariosFormPage;