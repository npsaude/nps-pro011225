import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  FileText,
  User,
  Building2,
  CalendarRange,
  Stethoscope,
  FolderOpen,
  ImageIcon,
  FileIcon,
  ExternalLink,
  Loader2,
} from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminFormLayout from "@/features/admin/forms/AdminFormLayout";
import FormLoadingScreen from "@/features/admin/forms/FormLoadingScreen";
import AdminFormTabs from "@/features/admin/forms/AdminFormTabs";
import ConfiguredSection from "@/features/admin/forms/ConfiguredSection";
import type { FieldConfig } from "@/features/admin/forms/field-config";
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

// ── Config das seções de campos ───────────────────────────────────────────────
const SECTIONS: {
  icon: React.ElementType;
  color: string;
  title: string;
  fields: FieldConfig<FormValues>[];
}[] = [
  {
    icon: FileText,
    color: "bg-blue-600",
    title: "Identificação da Guia",
    fields: [
      { name: "registro_ans", label: "Registro ANS", placeholder: "000000" },
      { name: "numero_guia_prestador", label: "Nº Guia Prestador", placeholder: "Ex: 12345" },
      { name: "numero_guia_solicitacao", label: "Nº Guia Solicitação", placeholder: "Ex: 67890" },
      { name: "numero_guia_operadora", label: "Nº Guia Operadora", placeholder: "Ex: 99999" },
      { name: "senha", label: "Senha", placeholder: "Senha de autorização" },
      { name: "data_emissao", label: "Data de Emissão", type: "date" },
    ],
  },
  {
    icon: User,
    color: "bg-violet-600",
    title: "Beneficiário",
    fields: [
      { name: "numero_carteira", label: "Nº Carteira", placeholder: "Número da carteirinha" },
      { name: "nome_beneficiario", label: "Nome do Beneficiário", placeholder: "Nome completo", span: "2" },
      { name: "nome_social", label: "Nome Social", placeholder: "Nome social (se houver)", span: "2" },
      { name: "atendimento_rn", label: "Atendimento RN", placeholder: "S / N" },
    ],
  },
  {
    icon: Building2,
    color: "bg-emerald-600",
    title: "Contratado e Executante",
    fields: [
      { name: "contratado_codigo_operadora", label: "Cód. Operadora (Contratado)", placeholder: "Código" },
      { name: "contratado_nome", label: "Nome do Contratado", placeholder: "Nome da instituição", span: "2" },
      { name: "contratado_cnes", label: "CNES (Contratado)", placeholder: "CNES" },
      { name: "executante_codigo_operadora", label: "Cód. Operadora (Executante)", placeholder: "Código" },
      { name: "executante_nome", label: "Nome do Executante", placeholder: "Nome" },
      { name: "executante_cnes", label: "CNES (Executante)", placeholder: "CNES" },
    ],
  },
  {
    icon: Stethoscope,
    color: "bg-sky-600",
    title: "Profissional Executante",
    fields: [
      { name: "profissional_seq_ref", label: "Seq. Ref.", placeholder: "Seq." },
      { name: "profissional_grau_participacao", label: "Grau de Participação", placeholder: "Ex: 01" },
      { name: "profissional_cpf", label: "CPF", placeholder: "000.000.000-00" },
      { name: "profissional_nome", label: "Nome do Profissional", placeholder: "Nome completo", span: "2" },
      { name: "profissional_conselho_codigo", label: "Conselho", placeholder: "CRM / CRO..." },
      { name: "profissional_numero_conselho", label: "Nº Conselho", placeholder: "Número" },
      { name: "profissional_uf", label: "UF", placeholder: "SP", maxLength: 2 },
      { name: "profissional_cbo", label: "CBO", placeholder: "Código CBO" },
    ],
  },
  {
    icon: CalendarRange,
    color: "bg-amber-500",
    title: "Valores e Período",
    fields: [
      { name: "data_inicio_faturamento", label: "Início do Faturamento", type: "date" },
      { name: "data_fim_faturamento", label: "Fim do Faturamento", type: "date" },
      { name: "valor_total_honorarios", label: "Valor Total Honorários (R$)", type: "number", step: "0.01", min: "0", placeholder: "0,00" },
      { name: "valor_total_faturamento", label: "Valor Total Faturamento (R$)", type: "number", step: "0.01", min: "0", placeholder: "0,00" },
      { name: "observacao", label: "Observações", span: "full", multiline: true, rows: 3, placeholder: "Observações adicionais sobre a guia..." },
    ],
  },
];

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
      <AdminFormTabs
        isEdit={isEdit}
        dadosIcon={FileText}
        formId="guia-form"
        onSubmit={handleSubmit(onSubmit)}
        saving={saving}
        onCancel={() => navigate("/admin/guia-solicitacao")}
        documentos={id ? <DocumentosTab guiaId={id} /> : undefined}
      >
        {SECTIONS.map((section) => (
          <ConfiguredSection
            key={section.title}
            icon={section.icon}
            color={section.color}
            title={section.title}
            fields={section.fields}
            register={register}
          />
        ))}
      </AdminFormTabs>
    </AdminFormLayout>
  );
};

export default GuiaSolicitacaoFormPage;