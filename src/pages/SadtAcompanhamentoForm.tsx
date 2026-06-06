import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Activity,
  User,
  Building2,
  CalendarRange,
  Stethoscope,
  ClipboardList,
} from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminFormLayout from "@/features/admin/forms/AdminFormLayout";
import FormLoadingScreen from "@/features/admin/forms/FormLoadingScreen";
import AdminFormTabs from "@/features/admin/forms/AdminFormTabs";
import ConfiguredSection from "@/features/admin/forms/ConfiguredSection";
import AttachmentsPanel from "@/features/admin/forms/AttachmentsPanel";
import type { FieldConfig } from "@/features/admin/forms/field-config";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchSadtAcompanhamento,
  fetchSadtAcompanhamentoDocPaths,
  saveSadtAcompanhamento,
} from "@/services/sadt-service";
import { createSignedDocItems } from "@/services/storage-docs-service";
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

// ── Config das seções de campos ───────────────────────────────────────────────
const SECTIONS: {
  icon: React.ElementType;
  color: string;
  title: string;
  fields: FieldConfig<FormValues>[];
}[] = [
  {
    icon: Activity,
    color: "bg-teal-600",
    title: "Identificação da Guia SADT",
    fields: [
      { name: "registro_ans", label: "Registro ANS", placeholder: "000000" },
      { name: "numero_guia_prestador", label: "Nº Guia Prestador", placeholder: "Ex: 12345" },
      { name: "numero_guia_sadt", label: "Nº Guia SADT (Atribuído pela Operadora)", placeholder: "Ex: 67890" },
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
    title: "Solicitante",
    fields: [
      { name: "solicitante_codigo_operadora", label: "Cód. Operadora (Solicitante)", placeholder: "Código" },
      { name: "solicitante_nome", label: "Nome do Solicitante", placeholder: "Nome da instituição", span: "2" },
      { name: "solicitante_cnes", label: "CNES (Solicitante)", placeholder: "CNES" },
      { name: "solicitante_profissional_nome", label: "Profissional Solicitante", placeholder: "Nome do médico solicitante", span: "2" },
      { name: "solicitante_profissional_conselho_codigo", label: "Conselho", placeholder: "CRM / CRO..." },
      { name: "solicitante_profissional_numero_conselho", label: "Nº Conselho", placeholder: "Número" },
      { name: "solicitante_profissional_uf", label: "UF", placeholder: "SP", maxLength: 2 },
      { name: "solicitante_profissional_cbo", label: "CBO", placeholder: "Código CBO" },
    ],
  },
  {
    icon: Building2,
    color: "bg-sky-600",
    title: "Executante",
    fields: [
      { name: "executante_codigo_operadora", label: "Cód. Operadora (Executante)", placeholder: "Código" },
      { name: "executante_nome", label: "Nome do Executante", placeholder: "Nome", span: "2" },
      { name: "executante_cnes", label: "CNES (Executante)", placeholder: "CNES" },
    ],
  },
  {
    icon: ClipboardList,
    color: "bg-orange-500",
    title: "Dados do Atendimento",
    fields: [
      { name: "carater_atendimento", label: "Caráter Atendimento", placeholder: "Eletivo / Urgência" },
      { name: "tipo_atendimento", label: "Tipo Atendimento", placeholder: "Ex: Ambulatorial" },
      { name: "indicacao_acidente", label: "Indicação Acidente", placeholder: "Ex: 9 - Não acidente" },
      { name: "tipo_consulta", label: "Tipo Consulta", placeholder: "Ex: Primeira / Retorno" },
      { name: "motivo_encerramento", label: "Motivo Encerramento", placeholder: "Código" },
      { name: "data_solicitacao", label: "Data Solicitação", type: "date" },
      { name: "indicacao_clinica", label: "Indicação Clínica", span: "full", multiline: true, rows: 2, placeholder: "Indicação clínica do procedimento..." },
    ],
  },
  {
    icon: Stethoscope,
    color: "bg-indigo-600",
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
    title: "Datas, Senha e Valores",
    fields: [
      { name: "data_autorizacao", label: "Data Autorização", type: "date" },
      { name: "data_validade_senha", label: "Validade da Senha", type: "date" },
      { name: "data_inicio_atendimento", label: "Início Atendimento", type: "date" },
      { name: "data_fim_atendimento", label: "Fim Atendimento", type: "date" },
      { name: "valor_total_procedimentos", label: "Vlr. Procedimentos (R$)", type: "number", step: "0.01", min: "0", placeholder: "0,00" },
      { name: "valor_total_taxas", label: "Vlr. Taxas (R$)", type: "number", step: "0.01", min: "0", placeholder: "0,00" },
      { name: "valor_total_materiais", label: "Vlr. Materiais (R$)", type: "number", step: "0.01", min: "0", placeholder: "0,00" },
      { name: "valor_total_medicamentos", label: "Vlr. Medicamentos (R$)", type: "number", step: "0.01", min: "0", placeholder: "0,00" },
      { name: "valor_total_geral", label: "Valor Total Geral (R$)", type: "number", step: "0.01", min: "0", placeholder: "0,00" },
      { name: "observacao", label: "Observações", span: "full", multiline: true, rows: 3, placeholder: "Observações adicionais sobre a SADT..." },
    ],
  },
];

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
      const data = await fetchSadtAcompanhamento(id);

      if (!data) {
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

    const { error } = await saveSadtAcompanhamento(payload, isEdit ? id : undefined);

    setSaving(false);

    if (error) {
      showError("Não foi possível salvar a SADT: " + error.message);
    } else {
      showSuccess(isEdit ? "SADT atualizada com sucesso." : "SADT criada com sucesso.");
      navigate("/admin/sadt-acompanhamento");
    }
  };

  const loadDocs = useCallback(
    async () => createSignedDocItems(await fetchSadtAcompanhamentoDocPaths(id!)),
    [id],
  );

  if (loadingData) {
    return <FormLoadingScreen message="Carregando dados da SADT..." />;
  }

  return (
    <AdminFormLayout
      sidebar={<AdminSidebar section="sadt-acompanhamento" />}
      accent="teal"
      icon={Activity}
      title={isEdit ? "Editar SADT" : "Nova SADT"}
      subtitle={
        isEdit
          ? "Atualize os dados do acompanhamento de SADT."
          : "Preencha os dados para cadastrar uma nova SADT."
      }
      onBack={() => navigate("/admin/sadt-acompanhamento")}
      outerClassName={isMedicoRoute ? "pb-32 lg:pb-0" : undefined}
      floating={isMedicoRoute ? <MedicoFloatingNav /> : undefined}
    >
      <AdminFormTabs
        isEdit={isEdit}
        dadosIcon={ClipboardList}
        dadosLabel="Dados da SADT"
        createLabel="Salvar SADT"
        formId="sadt-form"
        onSubmit={handleSubmit(onSubmit)}
        saving={saving}
        onCancel={() => navigate("/admin/sadt-acompanhamento")}
        documentos={<AttachmentsPanel loadDocs={loadDocs} />}
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

export default SadtAcompanhamentoFormPage;
