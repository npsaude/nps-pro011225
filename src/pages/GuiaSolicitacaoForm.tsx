import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  FileText,
  User,
  Building2,
  CalendarRange,
  Stethoscope,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeaderActions from "@/components/admin/AdminHeaderActions";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

type FormValues = {
  registro_ans: string;
  numero_guia_prestador: string;
  numero_guia_solicitacao: string;
  numero_guia_operadora: string;
  senha: string;
  // Beneficiário
  numero_carteira: string;
  nome_beneficiario: string;
  nome_social: string;
  atendimento_rn: string;
  // Contratado
  contratado_codigo_operadora: string;
  contratado_nome: string;
  contratado_cnes: string;
  // Executante
  executante_codigo_operadora: string;
  executante_nome: string;
  executante_cnes: string;
  // Profissional
  profissional_seq_ref: string;
  profissional_grau_participacao: string;
  profissional_cpf: string;
  profissional_nome: string;
  profissional_conselho_codigo: string;
  profissional_numero_conselho: string;
  profissional_uf: string;
  profissional_cbo: string;
  // Faturamento
  data_inicio_faturamento: string;
  data_fim_faturamento: string;
  data_emissao: string;
  valor_total_honorarios: string;
  valor_total_faturamento: string;
  observacao: string;
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
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${color}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

// ── Campo com label ───────────────────────────────────────────────────────────
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
    <div
      className={
        span === "full"
          ? "sm:col-span-2 lg:col-span-3"
          : span === "2"
          ? "sm:col-span-2"
          : ""
      }
    >
      <Label className="mb-1 block text-xs font-medium text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ── Estilo de input ───────────────────────────────────────────────────────────
const inputCls =
  "h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";

const GuiaSolicitacaoFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues,
  });

  // Carrega dados para edição
  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("guia_solicitacao")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
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
          data.valor_total_honorarios != null
            ? String(data.valor_total_honorarios)
            : "",
        valor_total_faturamento:
          data.valor_total_faturamento != null
            ? String(data.valor_total_faturamento)
            : "",
        observacao: data.observacao ?? "",
      });
      setLoadingData(false);
    })();
  }, [id, navigate, reset]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      valor_total_honorarios: values.valor_total_honorarios
        ? Number(values.valor_total_honorarios)
        : null,
      valor_total_faturamento: values.valor_total_faturamento
        ? Number(values.valor_total_faturamento)
        : null,
      observacao: values.observacao || null,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase
        .from("guia_solicitacao")
        .update(payload)
        .eq("id", id));
    } else {
      ({ error } = await supabase.from("guia_solicitacao").insert(payload));
    }

    setSaving(false);

    if (error) {
      showError("Não foi possível salvar a guia: " + error.message);
    } else {
      showSuccess(isEdit ? "Guia atualizada com sucesso." : "Guia criada com sucesso.");
      navigate("/admin/guia-solicitacao");
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Carregando dados da guia...
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,#E6EEF7_0,#F5F7F9_55%),radial-gradient(circle_at_100%_100%,#D9DEE3_0,#F5F7F9_60%)] text-slate-900">
      <div className="flex min-h-screen w-full max-w-7xl flex-1 gap-0 px-3 py-4 sm:px-4 lg:mx-auto lg:gap-4">
        <AdminSidebar section="guia-solicitacao" />

        <div className="flex flex-1 flex-col gap-4 rounded-3xl bg-white/90 lg:p-4 lg:shadow-[0_18px_60px_rgba(15,23,42,0.10)] lg:backdrop-blur-xl">
          {/* Header */}
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/admin/guia-solicitacao")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <FileText className="h-4 w-4" />
                  </span>
                  {isEdit ? "Editar Guia" : "Nova Guia de Solicitação"}
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  {isEdit
                    ? "Atualize os dados da guia de solicitação."
                    : "Preencha os dados para cadastrar uma nova guia de solicitação."}
                </p>
              </div>
            </div>
            <AdminHeaderActions notificationsCount={0} />
          </header>

          {/* Formulário */}
          <form
            id="guia-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 pb-6"
          >
            {/* 1. Identificação da Guia */}
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
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("valor_total_honorarios")}
                  className={inputCls}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Valor Total Faturamento (R$)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("valor_total_faturamento")}
                  className={inputCls}
                  placeholder="0,00"
                />
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

            {/* Rodapé com botões */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/guia-solicitacao")}
                disabled={saving}
                className="rounded-full px-6"
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
        </div>
      </div>
    </div>
  );
};

export default GuiaSolicitacaoFormPage;
