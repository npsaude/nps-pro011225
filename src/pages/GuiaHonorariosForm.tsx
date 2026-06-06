import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Receipt, User, Stethoscope, ClipboardList, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminFormLayout from "@/features/admin/forms/AdminFormLayout";
import FormLoadingScreen from "@/features/admin/forms/FormLoadingScreen";
import AdminFormTabs from "@/features/admin/forms/AdminFormTabs";
import ConfiguredSection from "@/features/admin/forms/ConfiguredSection";
import FormSection from "@/features/admin/forms/FormSection";
import AttachmentsPanel from "@/features/admin/forms/AttachmentsPanel";
import type { FieldConfig } from "@/features/admin/forms/field-config";
import { inputClass } from "@/features/admin/forms/field-styles";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchGuiaHonorarios,
  fetchGuiaHonorariosDocPaths,
  saveGuiaHonorarios,
} from "@/services/guia-honorarios-service";
import { createSignedDocItems } from "@/services/storage-docs-service";
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

type Register = ReturnType<typeof useForm<FormValues>>["register"];

const INPUT_CLS = inputClass("emerald");

// ── Config dos campos regulares por seção ─────────────────────────────────────
const PROFISSIONAL_FIELDS: FieldConfig<FormValues>[] = [
  { name: "profissional_nome", label: "Nome do Profissional", placeholder: "Nome completo", span: "2" },
  { name: "profissional_cod_sist", label: "Cód. Sistema", placeholder: "Código" },
  { name: "profissional_crm", label: "CRM", placeholder: "Número CRM" },
];

const PACIENTE_FIELDS: FieldConfig<FormValues>[] = [
  { name: "paciente_registro", label: "Registro", placeholder: "Nº registro" },
  { name: "paciente_nome", label: "Nome do Paciente", placeholder: "Nome completo", span: "2" },
  { name: "paciente_leito", label: "Leito", placeholder: "Ex: 101-A" },
  { name: "data", label: "Data", type: "date" },
  { name: "hora", label: "Hora", type: "time" },
  { name: "convenio", label: "Convênio", placeholder: "Nome do convênio" },
];

const PROC_MED_FIELDS: FieldConfig<FormValues>[] = [
  { name: "proc_med_visita_cod_sistema", label: "Visita — Cód. Sistema", placeholder: "Código" },
  { name: "proc_med_visita_qtd", label: "Visita — Qtd.", type: "number", min: "0", placeholder: "0" },
  { name: "proc_med_parecer_cod_sistema", label: "Parecer — Cód. Sistema", placeholder: "Código" },
  { name: "proc_med_parecer_qtd", label: "Parecer — Qtd.", type: "number", min: "0", placeholder: "0" },
  { name: "proc_med_outros_cod_sistema", label: "Outros — Cód. Sistema", placeholder: "Código" },
  { name: "proc_med_outros_amb_cbhpm", label: "Outros — AMB/CBHPM", placeholder: "AMB/CBHPM" },
  { name: "proc_med_outros_qtd", label: "Outros — Qtd.", type: "number", min: "0", placeholder: "0" },
];

// ── Blocos irregulares (escape hatch) ─────────────────────────────────────────
function ProcedimentosCirurgicos({ register }: { register: Register }) {
  return (
    <>
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
                className={INPUT_CLS}
                placeholder="Descrição do procedimento"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">Cód. Sistema</Label>
              <input
                {...register(`proc_cir_${n}_cod_sistema` as keyof FormValues)}
                className={INPUT_CLS}
                placeholder="Código"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">AMB/CBHPM</Label>
              <input
                {...register(`proc_cir_${n}_amb_cbhpm` as keyof FormValues)}
                className={INPUT_CLS}
                placeholder="AMB/CBHPM"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">Via de Acesso</Label>
              <input
                {...register(`proc_cir_${n}_via_acesso` as keyof FormValues)}
                className={INPUT_CLS}
                placeholder="Via de acesso"
              />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function EquipeCirurgica({ register }: { register: Register }) {
  return (
    <>
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
              <input {...register(`${prefix}_medico` as keyof FormValues)} className={INPUT_CLS} placeholder="Nome" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">Cód. Sistema</Label>
              <input {...register(`${prefix}_cod_sist` as keyof FormValues)} className={INPUT_CLS} placeholder="Código" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">CPF</Label>
              <input {...register(`${prefix}_cpf` as keyof FormValues)} className={INPUT_CLS} placeholder="000.000.000-00" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-slate-500">CRM</Label>
              <input {...register(`${prefix}_crm` as keyof FormValues)} className={INPUT_CLS} placeholder="Número CRM" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function ProcMedExtra({
  register,
  label,
  descField,
  codField,
  ambField,
  qtdField,
}: {
  register: Register;
  label: string;
  descField: keyof FormValues;
  codField: keyof FormValues;
  ambField: keyof FormValues;
  qtdField: keyof FormValues;
}) {
  return (
    <div className="sm:col-span-2 lg:col-span-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Label className="mb-1 block text-xs font-medium text-slate-500">Descrição</Label>
          <input {...register(descField)} className={INPUT_CLS} placeholder="Descrição" />
        </div>
        <div>
          <Label className="mb-1 block text-xs font-medium text-slate-500">Cód. Sistema</Label>
          <input {...register(codField)} className={INPUT_CLS} placeholder="Código" />
        </div>
        <div>
          <Label className="mb-1 block text-xs font-medium text-slate-500">AMB/CBHPM</Label>
          <input {...register(ambField)} className={INPUT_CLS} placeholder="AMB/CBHPM" />
        </div>
        <div>
          <Label className="mb-1 block text-xs font-medium text-slate-500">Qtd.</Label>
          <input type="number" min="0" {...register(qtdField)} className={INPUT_CLS} placeholder="0" />
        </div>
      </div>
    </div>
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
      const data = await fetchGuiaHonorarios(id);

      if (!data) {
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

    const { error } = await saveGuiaHonorarios(payload, isEdit ? id : undefined);

    setSaving(false);

    if (error) {
      showError("Não foi possível salvar a guia: " + error.message);
    } else {
      showSuccess(isEdit ? "Guia atualizada com sucesso." : "Guia criada com sucesso.");
      navigate("/admin/guia-honorarios");
    }
  };

  const loadDocs = useCallback(
    async () => createSignedDocItems(await fetchGuiaHonorariosDocPaths(id!)),
    [id],
  );

  if (loadingData) {
    return <FormLoadingScreen />;
  }

  return (
    <AdminFormLayout
      sidebar={<AdminSidebar documentosSubsection="guia-honorarios" />}
      accent="emerald"
      icon={Receipt}
      title={isEdit ? "Editar Guia de Honorários" : "Nova Guia de Honorários"}
      subtitle={
        isEdit
          ? "Atualize os dados da guia de honorários."
          : "Preencha os dados para cadastrar uma nova guia de honorários."
      }
      onBack={() => navigate("/admin/guia-honorarios")}
    >
      <AdminFormTabs
        isEdit={isEdit}
        dadosIcon={Receipt}
        formId="guia-honorarios-form"
        onSubmit={handleSubmit(onSubmit)}
        saving={saving}
        onCancel={() => navigate("/admin/guia-honorarios")}
        documentos={<AttachmentsPanel loadDocs={loadDocs} supportsPdf />}
      >
        <ConfiguredSection
          icon={Stethoscope}
          color="bg-emerald-600"
          title="Profissional"
          fields={PROFISSIONAL_FIELDS}
          register={register}
        />
        <ConfiguredSection
          icon={User}
          color="bg-blue-600"
          title="Paciente"
          fields={PACIENTE_FIELDS}
          register={register}
        />
        <FormSection icon={ClipboardList} color="bg-violet-600" title="Procedimentos Cirúrgicos">
          <ProcedimentosCirurgicos register={register} />
        </FormSection>
        <FormSection icon={Users} color="bg-sky-600" title="Equipe Cirúrgica">
          <EquipeCirurgica register={register} />
        </FormSection>
        <ConfiguredSection
          icon={Receipt}
          color="bg-amber-500"
          title="Procedimentos Médicos"
          fields={PROC_MED_FIELDS}
          register={register}
          extra={
            <>
              <ProcMedExtra
                register={register}
                label="Extra 1"
                descField="proc_med_extra1_desc"
                codField="proc_med_extra1_cod_sistema"
                ambField="proc_med_extra1_amb_cbhpm"
                qtdField="proc_med_extra1_qtd"
              />
              <ProcMedExtra
                register={register}
                label="Extra 2"
                descField="proc_med_extra2_desc"
                codField="proc_med_extra2_cod_sistema"
                ambField="proc_med_extra2_amb_cbhpm"
                qtdField="proc_med_extra2_qtd"
              />
            </>
          }
        />
      </AdminFormTabs>
    </AdminFormLayout>
  );
};

export default GuiaHonorariosFormPage;
