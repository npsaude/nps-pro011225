import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  FileSignature,
  User,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  Users,
  HeartPulse,
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
import FormSection from "@/features/admin/forms/FormSection";
import FormField from "@/features/admin/forms/FormField";
import TextField from "@/features/admin/forms/TextField";
import AttachmentsPanel from "@/features/admin/forms/AttachmentsPanel";
import type { FieldConfig } from "@/features/admin/forms/field-config";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchDescricaoCirurgicaRow,
  fetchDescricaoDocPaths,
  salvarDescricaoCirurgicaAdmin,
} from "@/services/descricao-cirurgica-service";
import { createSignedDocItems } from "@/services/storage-docs-service";
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

type Register = ReturnType<typeof useForm<FormValues>>["register"];

const SELECT_CLS =
  "h-9 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500";

// ── Config dos campos regulares por seção ─────────────────────────────────────
const IDENT_FIELDS: FieldConfig<FormValues>[] = [
  { name: "prontuario", label: "Prontuário", placeholder: "Nº prontuário" },
  { name: "registro", label: "Registro", placeholder: "Nº registro" },
  { name: "matricula", label: "Matrícula", placeholder: "Matrícula" },
  { name: "nome_social", label: "Nome Social", placeholder: "Nome social", span: "2" },
  { name: "registro_civil", label: "Registro Civil", placeholder: "Nome completo (registro civil)", span: "2" },
  { name: "cpf", label: "CPF", placeholder: "000.000.000-00" },
  { name: "data_nascimento", label: "Data de Nascimento", type: "date" },
  { name: "idade", label: "Idade", type: "number", min: "0", placeholder: "Anos" },
];

const INTERNACAO_FIELDS: FieldConfig<FormValues>[] = [
  { name: "convenio_plano", label: "Convênio / Plano", placeholder: "Nome do convênio", span: "2" },
  { name: "setor", label: "Setor", placeholder: "Setor" },
  { name: "leito", label: "Leito", placeholder: "Leito" },
];

const CIRURGIA_FIELDS: FieldConfig<FormValues>[] = [
  { name: "tipo_cirurgia", label: "Tipo de Cirurgia", placeholder: "Ex: Videolaparoscopia, Aberta...", span: "2" },
  { name: "data_inicio_procedimento", label: "Data Início", type: "date" },
  { name: "hora_inicio_procedimento", label: "Hora Início", type: "time" },
  { name: "data_fim_procedimento", label: "Data Fim", type: "date" },
  { name: "hora_fim_procedimento", label: "Hora Fim", type: "time" },
  { name: "diagnostico_pre_operatorio", label: "Diagnóstico Pré-operatório", span: "full", multiline: true, rows: 2, placeholder: "Diagnóstico pré-operatório..." },
  { name: "diagnostico_pos_operatorio", label: "Diagnóstico Pós-operatório", span: "full", multiline: true, rows: 2, placeholder: "Diagnóstico pós-operatório..." },
];

const CIRURGIAO_FIELDS: FieldConfig<FormValues>[] = [
  { name: "cirurgiao_responsavel", label: "Nome do Cirurgião", placeholder: "Nome completo", span: "2" },
  { name: "cirurgiao_responsavel_crm", label: "CRM", placeholder: "Número CRM" },
];

const POS_OP_FIELDS: FieldConfig<FormValues>[] = [
  { name: "sangramento_estimado", label: "Sangramento Estimado", placeholder: "Ex: 200ml" },
  { name: "descricao_complicacoes", label: "Descrição de Complicações", placeholder: "Se houver complicações...", span: "2" },
  { name: "observacoes_adicionais", label: "Observações Adicionais", span: "full", multiline: true, rows: 3, placeholder: "Observações adicionais..." },
];

const ORIENTACOES_FIELDS: FieldConfig<FormValues>[] = [
  { name: "uso_antibioticos", label: "Uso de Antibióticos", placeholder: "Sim / Não / Qual..." },
  { name: "profilaxia_tev_tvp", label: "Profilaxia TEV/TVP", placeholder: "Sim / Não / Qual..." },
  { name: "troca_curativo", label: "Troca de Curativo", placeholder: "Frequência..." },
  { name: "dieta", label: "Dieta", placeholder: "Ex: Livre, Leve..." },
  { name: "deambulacao", label: "Deambulação", placeholder: "Ex: Livre, Restrita..." },
  { name: "previsao_alta", label: "Previsão de Alta", placeholder: "Ex: 24h, 48h..." },
  { name: "outras_orientacoes", label: "Outras Orientações", span: "full", multiline: true, rows: 3, placeholder: "Outras orientações ao paciente..." },
];

const DESCRICAO_FIELD: FieldConfig<FormValues> = {
  name: "descricao_cirurgica",
  label: "Texto da Descrição",
  span: "full",
  multiline: true,
  rows: 8,
  placeholder: "Descreva detalhadamente o procedimento cirúrgico realizado...",
};

// ── Selects (escape hatch) ────────────────────────────────────────────────────
function SexoSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FormField label="Sexo">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={SELECT_CLS}>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="M">Masculino</SelectItem>
          <SelectItem value="F">Feminino</SelectItem>
          <SelectItem value="O">Outro</SelectItem>
        </SelectContent>
      </Select>
    </FormField>
  );
}

function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FormField label="Status">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={SELECT_CLS}>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
          <SelectItem value="APROVADO">Aprovado</SelectItem>
          <SelectItem value="REPROVADO">Reprovado</SelectItem>
          <SelectItem value="FATURADO">Faturado</SelectItem>
        </SelectContent>
      </Select>
    </FormField>
  );
}

// ── Seção "Dados da Cirurgia" (Select como primeiro campo) ────────────────────
function DadosCirurgiaSection({
  register,
  status,
  onStatusChange,
}: {
  register: Register;
  status: string;
  onStatusChange: (v: string) => void;
}) {
  return (
    <FormSection icon={Stethoscope} color="bg-violet-600" title="Dados da Cirurgia">
      <StatusSelect value={status} onChange={onStatusChange} />
      {CIRURGIA_FIELDS.map((config) => (
        <TextField key={config.name} config={config} register={register} />
      ))}
    </FormSection>
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
      const data = await fetchDescricaoCirurgicaRow(id);

      if (!data) {
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

    const { error } = await salvarDescricaoCirurgicaAdmin(payload, isEdit ? id : undefined);

    setSaving(false);

    if (error) {
      showError("Não foi possível salvar: " + error.message);
    } else {
      showSuccess(isEdit ? "Descrição atualizada com sucesso." : "Descrição criada com sucesso.");
      navigate("/admin/descricao-cirurgica");
    }
  };

  const loadDocs = useCallback(
    async () => createSignedDocItems(await fetchDescricaoDocPaths(id!)),
    [id],
  );

  if (loadingData) {
    return <FormLoadingScreen message="Carregando dados da descrição..." />;
  }

  return (
    <AdminFormLayout
      sidebar={<AdminSidebar section="descricao-cirurgica" />}
      accent="teal"
      icon={FileSignature}
      title={isEdit ? "Editar Descrição Cirúrgica" : "Nova Descrição Cirúrgica"}
      subtitle={
        isEdit
          ? "Atualize os dados da descrição cirúrgica."
          : "Preencha os dados para cadastrar uma nova descrição cirúrgica."
      }
      onBack={() => navigate("/admin/descricao-cirurgica")}
    >
      <AdminFormTabs
        isEdit={isEdit}
        dadosIcon={FileSignature}
        dadosLabel="Dados"
        createLabel="Salvar Descrição"
        formId="descricao-form"
        onSubmit={handleSubmit(onSubmit)}
        saving={saving}
        onCancel={() => navigate("/admin/descricao-cirurgica")}
        documentos={<AttachmentsPanel loadDocs={loadDocs} />}
      >
        <ConfiguredSection
          icon={User}
          color="bg-teal-600"
          title="Identificação do Paciente"
          fields={IDENT_FIELDS}
          register={register}
          extra={<SexoSelect value={watch("sexo")} onChange={(v) => setValue("sexo", v)} />}
        />
        <ConfiguredSection
          icon={ClipboardList}
          color="bg-blue-600"
          title="Internação"
          fields={INTERNACAO_FIELDS}
          register={register}
        />
        <DadosCirurgiaSection
          register={register}
          status={watch("status")}
          onStatusChange={(v) => setValue("status", v)}
        />
        <FormSection icon={FileSignature} color="bg-amber-500" title="Descrição Cirúrgica">
          <TextField config={DESCRICAO_FIELD} register={register} />
        </FormSection>
        <ConfiguredSection
          icon={Users}
          color="bg-sky-600"
          title="Cirurgião Responsável"
          fields={CIRURGIAO_FIELDS}
          register={register}
        />
        <ConfiguredSection
          icon={HeartPulse}
          color="bg-rose-500"
          title="Pós-operatório e Complicações"
          fields={POS_OP_FIELDS}
          register={register}
        />
        <ConfiguredSection
          icon={FlaskConical}
          color="bg-emerald-600"
          title="Orientações Pós-alta"
          fields={ORIENTACOES_FIELDS}
          register={register}
        />
      </AdminFormTabs>
    </AdminFormLayout>
  );
};

export default DescricaoCirurgicaAdminFormPage;
