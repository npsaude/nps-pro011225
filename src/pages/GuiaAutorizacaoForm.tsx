import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ShieldCheck,
  User,
  Building2,
  CalendarRange,
  Stethoscope,
  DollarSign,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminFormLayout from "@/features/admin/forms/AdminFormLayout";
import FormLoadingScreen from "@/features/admin/forms/FormLoadingScreen";
import AdminFormTabs from "@/features/admin/forms/AdminFormTabs";
import ConfiguredSection from "@/features/admin/forms/ConfiguredSection";
import AttachmentsPanel from "@/features/admin/forms/AttachmentsPanel";
import FormField from "@/features/admin/forms/FormField";
import type { FieldConfig } from "@/features/admin/forms/field-config";
import { inputClass } from "@/features/admin/forms/field-styles";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchGuiaAutorizacao,
  fetchGuiaAutorizacaoDocPaths,
  saveGuiaAutorizacao,
} from "@/services/guia-autorizacao-service";
import { createSignedDocItems } from "@/services/storage-docs-service";
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

// ── Config dos campos regulares por seção ─────────────────────────────────────
const IDENT_FIELDS: FieldConfig<FormValues>[] = [
  { name: "numero_autorizacao", label: "Nº Autorização", placeholder: "Ex: 123456789" },
  { name: "numero_guia_honorarios", label: "Nº Guia Honorários", placeholder: "Ex: 987654" },
  { name: "numero_guia_internacao", label: "Nº Guia Internação", placeholder: "Ex: 111222" },
];

const PACIENTE_FIELDS: FieldConfig<FormValues>[] = [
  { name: "paciente_nome", label: "Nome do Paciente", placeholder: "Nome completo", span: "2" },
  { name: "paciente_cpf", label: "CPF", placeholder: "000.000.000-00" },
  { name: "paciente_carteirinha", label: "Nº Carteirinha", placeholder: "Número da carteirinha", span: "2" },
  { name: "paciente_convenio", label: "Convênio", placeholder: "Nome do convênio" },
];

const HOSPITAL_FIELDS: FieldConfig<FormValues>[] = [
  { name: "hospital_nome", label: "Nome do Hospital / Clínica", placeholder: "Nome da instituição", span: "2" },
  { name: "hospital_codigo_cnes", label: "CNES", placeholder: "Código CNES" },
];

const CIRURGIA_FIELDS: FieldConfig<FormValues>[] = [
  { name: "data_cirurgia", label: "Data da Cirurgia", type: "date" },
  { name: "data_atendimento", label: "Data do Atendimento", type: "date" },
  { name: "hora_inicio", label: "Hora Início", type: "time" },
  { name: "hora_fim", label: "Hora Fim", type: "time" },
  { name: "tipo_cirurgia", label: "Tipo de Cirurgia", placeholder: "Ex: ELETIVA / EMERGENCIAL" },
  { name: "atuou_como", label: "Atuou Como", placeholder: "Ex: Cirurgião, Auxiliar..." },
  { name: "diagnostico_cid", label: "CID", placeholder: "Ex: K35.2" },
  { name: "diagnostico_descricao", label: "Diagnóstico", placeholder: "Descrição do diagnóstico", span: "2" },
];

const EQUIPE_FIELDS: FieldConfig<FormValues>[] = [
  { name: "cirurgiao_principal_nome", label: "Cirurgião Principal", placeholder: "Nome completo", span: "2" },
  { name: "cirurgiao_principal_crm", label: "CRM", placeholder: "Número CRM" },
  { name: "cirurgiao_principal_uf", label: "UF", placeholder: "SP", maxLength: 2 },
  { name: "cirurgiao_principal_cbo", label: "CBO", placeholder: "Código CBO" },
];

const VALORES_FIELDS: FieldConfig<FormValues>[] = [
  { name: "valor_total_faturado", label: "Valor Total Faturado (R$)", type: "number", step: "0.01", min: "0", placeholder: "0,00" },
  { name: "valor_total_glosa", label: "Valor Total Glosa (R$)", type: "number", step: "0.01", min: "0", placeholder: "0,00" },
  { name: "valor_total_liquido", label: "Valor Líquido (R$)", type: "number", step: "0.01", min: "0", placeholder: "0,00" },
  { name: "valor_total_repasse", label: "Valor Repasse (R$)", type: "number", step: "0.01", min: "0", placeholder: "0,00" },
  { name: "forma_pagamento", label: "Forma de Pagamento", placeholder: "Ex: Transferência, Cheque..." },
  { name: "grau_participacao", label: "Grau de Participação", placeholder: "Ex: 01 - Cirurgião" },
  { name: "data_pagamento", label: "Data de Pagamento", type: "date" },
];

// ── Blocos irregulares (escape hatch) ─────────────────────────────────────────
function AuxiliaresGrid({ register }: { register: ReturnType<typeof useForm<FormValues>>["register"] }) {
  const cls = inputClass("violet");
  return (
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
              <input {...register(nameField)} className={cls} placeholder="Nome" />
              <input {...register(crmField)} className={`${cls} w-28 flex-shrink-0`} placeholder="CRM" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPagamentoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <FormField label="Status de Pagamento">
      <Select value={value} onValueChange={onChange}>
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
    </FormField>
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
      const data = await fetchGuiaAutorizacao(id);

      if (!data) {
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

    const { error } = await saveGuiaAutorizacao(payload, isEdit ? id : undefined);

    setSaving(false);

    if (error) {
      showError("Não foi possível salvar a guia: " + error.message);
    } else {
      showSuccess(isEdit ? "Guia atualizada com sucesso." : "Guia criada com sucesso.");
      navigate("/admin/guia-autorizacao");
    }
  };

  const loadDocs = useCallback(
    async () => createSignedDocItems(await fetchGuiaAutorizacaoDocPaths(id!)),
    [id],
  );

  if (loadingData) {
    return <FormLoadingScreen />;
  }

  return (
    <AdminFormLayout
      sidebar={<AdminSidebar section="guia-autorizacao" />}
      accent="violet"
      icon={ShieldCheck}
      title={isEdit ? "Editar Guia de Autorização" : "Nova Guia de Autorização"}
      subtitle={
        isEdit
          ? "Atualize os dados da guia de autorização."
          : "Preencha os dados para cadastrar uma nova guia de autorização."
      }
      onBack={() => navigate("/admin/guia-autorizacao")}
    >
      <AdminFormTabs
        isEdit={isEdit}
        dadosIcon={ShieldCheck}
        formId="guia-autorizacao-form"
        onSubmit={handleSubmit(onSubmit)}
        saving={saving}
        onCancel={() => navigate("/admin/guia-autorizacao")}
        documentos={<AttachmentsPanel loadDocs={loadDocs} />}
      >
        <ConfiguredSection
          icon={ShieldCheck}
          color="bg-violet-600"
          title="Identificação da Guia"
          fields={IDENT_FIELDS}
          register={register}
        />
        <ConfiguredSection
          icon={User}
          color="bg-blue-600"
          title="Paciente"
          fields={PACIENTE_FIELDS}
          register={register}
        />
        <ConfiguredSection
          icon={Building2}
          color="bg-emerald-600"
          title="Hospital / Clínica"
          fields={HOSPITAL_FIELDS}
          register={register}
        />
        <ConfiguredSection
          icon={CalendarRange}
          color="bg-amber-500"
          title="Dados da Cirurgia"
          fields={CIRURGIA_FIELDS}
          register={register}
        />
        <ConfiguredSection
          icon={Stethoscope}
          color="bg-sky-600"
          title="Equipe Cirúrgica"
          fields={EQUIPE_FIELDS}
          register={register}
          extra={<AuxiliaresGrid register={register} />}
        />
        <ConfiguredSection
          icon={DollarSign}
          color="bg-rose-500"
          title="Valores e Pagamento"
          fields={VALORES_FIELDS}
          register={register}
          extra={
            <StatusPagamentoField
              value={watch("status_pagamento")}
              onChange={(v) => setValue("status_pagamento", v)}
            />
          }
        />
      </AdminFormTabs>
    </AdminFormLayout>
  );
};

export default GuiaAutorizacaoFormPage;
