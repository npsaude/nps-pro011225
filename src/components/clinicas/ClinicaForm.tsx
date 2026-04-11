import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Landmark,
  FileText,
  MapPin,
  Phone,
  Mail,
  Save,
} from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  ClinicaInput,
  Clinica,
  TipoUnidade,
} from "@/services/clinicas-service";

// ── Estilos compartilhados (mesmo padrão do GuiaSolicitacaoForm) ──────────────
const inputCls =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";

// ── Seção visual ──────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  color,
  title,
  subtitle,
  children,
  cols = 2,
}: {
  icon: React.ElementType;
  color: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${color}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className={`grid gap-4 ${cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
        {children}
      </div>
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

// ── Schema ────────────────────────────────────────────────────────────────────
const clinicaSchema = z.object({
  tipo_unidade: z.enum(["CLINICA", "HOSPITAL"], {
    required_error: "Selecione se é clínica ou hospital.",
  }),
  codigo_referencial_got: z.string().optional(),
  razao_social: z.string().min(1, "Informe a razão social."),
  nome_fantasia: z.string().min(1, "Informe o nome fantasia."),
  nome_rede: z.string().optional(),
  cnpj: z.string().min(1, "Informe o CNPJ."),
  endereco: z.string().min(1, "Informe o endereço."),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Informe o bairro."),
  cidade: z.string().min(1, "Informe a cidade."),
  uf: z.string().min(2, "UF inválida.").max(2, "UF inválida."),
  telefone: z.string().optional(),
  contato: z.string().optional(),
  cargo: z.string().optional(),
  nome_contato_faturamento: z.string().optional(),
  email_contato_faturamento: z
    .string()
    .email("E-mail inválido.")
    .optional()
    .or(z.literal("")),
  email_contato_faturamento_secundario: z
    .string()
    .email("E-mail secundário inválido.")
    .optional()
    .or(z.literal("")),
  telefone_contato_faturamento: z.string().optional(),
});

export type ClinicaFormValues = z.infer<typeof clinicaSchema>;

interface ClinicaFormProps {
  clinica?: Clinica | null;
  onSubmit: (values: ClinicaInput) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

// ── Componente principal ──────────────────────────────────────────────────────
const ClinicaForm = ({ clinica, onSubmit, onCancel, isSubmitting }: ClinicaFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ClinicaFormValues>({
    resolver: zodResolver(clinicaSchema),
    defaultValues: {
      tipo_unidade: "CLINICA",
      codigo_referencial_got: "",
      razao_social: "",
      nome_fantasia: "",
      nome_rede: "",
      cnpj: "",
      endereco: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "PE",
      telefone: "",
      contato: "",
      cargo: "",
      nome_contato_faturamento: "",
      email_contato_faturamento: "",
      email_contato_faturamento_secundario: "",
      telefone_contato_faturamento: "",
    },
  });

  const tipoUnidade = watch("tipo_unidade");

  useEffect(() => {
    if (clinica) {
      reset({
        tipo_unidade: clinica.tipo_unidade,
        codigo_referencial_got: clinica.codigo_referencial_got ?? "",
        razao_social: clinica.razao_social,
        nome_fantasia: clinica.nome_fantasia,
        nome_rede: clinica.nome_rede ?? "",
        cnpj: clinica.cnpj,
        endereco: clinica.endereco,
        complemento: clinica.complemento ?? "",
        bairro: clinica.bairro,
        cidade: clinica.cidade,
        uf: clinica.uf,
        telefone: clinica.telefone ?? "",
        contato: clinica.contato ?? "",
        cargo: clinica.cargo ?? "",
        nome_contato_faturamento: clinica.nome_contato_faturamento ?? "",
        email_contato_faturamento: clinica.email_contato_faturamento ?? "",
        email_contato_faturamento_secundario:
          clinica.email_contato_faturamento_secundario ?? "",
        telefone_contato_faturamento: clinica.telefone_contato_faturamento ?? "",
      });
    }
  }, [clinica, reset]);

  const handleFormSubmit = (values: ClinicaFormValues) => {
    const payload: ClinicaInput = {
      tipo_unidade: values.tipo_unidade as TipoUnidade,
      codigo_referencial_got: values.codigo_referencial_got?.trim() || null,
      razao_social: values.razao_social,
      nome_fantasia: values.nome_fantasia,
      nome_rede: values.nome_rede || null,
      cnpj: values.cnpj,
      endereco: values.endereco,
      complemento: values.complemento || null,
      bairro: values.bairro,
      cidade: values.cidade,
      uf: values.uf,
      telefone: values.telefone || null,
      contato: values.contato || null,
      cargo: values.cargo || null,
      nome_contato_faturamento: values.nome_contato_faturamento || null,
      email_contato_faturamento: values.email_contato_faturamento || null,
      email_contato_faturamento_secundario:
        values.email_contato_faturamento_secundario || null,
      telefone_contato_faturamento: values.telefone_contato_faturamento || null,
    };
    void onSubmit(payload);
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex flex-col gap-4 pb-6"
    >
      {/* ── 1. Tipo de unidade ── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Tipo de unidade</h2>
            <p className="text-[11px] text-slate-400">Selecione se é uma clínica ou hospital</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue("tipo_unidade", "CLINICA")}
            className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
              tipoUnidade === "CLINICA"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
            }`}
          >
            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
              tipoUnidade === "CLINICA" ? "bg-indigo-100" : "bg-white"
            }`}>
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Clínica</p>
              <p className="text-[11px] opacity-60">Unidade ambulatorial</p>
            </div>
            {tipoUnidade === "CLINICA" && (
              <span className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setValue("tipo_unidade", "HOSPITAL")}
            className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
              tipoUnidade === "HOSPITAL"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
            }`}
          >
            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
              tipoUnidade === "HOSPITAL" ? "bg-indigo-100" : "bg-white"
            }`}>
              <Landmark className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">Hospital</p>
              <p className="text-[11px] opacity-60">Unidade hospitalar</p>
            </div>
            {tipoUnidade === "HOSPITAL" && (
              <span className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </button>
        </div>
        {errors.tipo_unidade && (
          <p className="mt-1.5 text-xs text-rose-500">{errors.tipo_unidade.message}</p>
        )}
      </div>

      {/* ── 2. Identificação ── */}
      <Section icon={FileText} color="bg-sky-600" title="Identificação" subtitle="Dados cadastrais da unidade" cols={2}>
        <Field label="Razão social" required>
          <input
            {...register("razao_social")}
            className={inputCls}
            placeholder="Razão social completa"
          />
          {errors.razao_social && (
            <p className="mt-1 text-xs text-rose-500">{errors.razao_social.message}</p>
          )}
        </Field>

        <Field label="Nome fantasia" required>
          <input
            {...register("nome_fantasia")}
            className={inputCls}
            placeholder="Nome fantasia"
          />
          {errors.nome_fantasia && (
            <p className="mt-1 text-xs text-rose-500">{errors.nome_fantasia.message}</p>
          )}
        </Field>

        <Field label="CNPJ" required>
          <input
            {...register("cnpj")}
            className={inputCls}
            placeholder="00.000.000/0000-00"
          />
          {errors.cnpj && (
            <p className="mt-1 text-xs text-rose-500">{errors.cnpj.message}</p>
          )}
        </Field>

        <Field label="Cód. Referencial (GOT)">
          <input
            {...register("codigo_referencial_got")}
            className={inputCls}
            placeholder="Ex: GOT-001"
          />
        </Field>

        <Field label="Nome da rede" span="2">
          <input
            {...register("nome_rede")}
            className={inputCls}
            placeholder="Ex: Rede Vida Saudável"
          />
        </Field>
      </Section>

      {/* ── 3. Localização ── */}
      <Section icon={MapPin} color="bg-emerald-600" title="Localização" subtitle="Endereço completo da unidade" cols={3}>
        <Field label="Endereço" required span="2">
          <input
            {...register("endereco")}
            className={inputCls}
            placeholder="Rua, número"
          />
          {errors.endereco && (
            <p className="mt-1 text-xs text-rose-500">{errors.endereco.message}</p>
          )}
        </Field>

        <Field label="Complemento">
          <input
            {...register("complemento")}
            className={inputCls}
            placeholder="Sala, bloco..."
          />
        </Field>

        <Field label="Bairro" required>
          <input
            {...register("bairro")}
            className={inputCls}
            placeholder="Bairro"
          />
          {errors.bairro && (
            <p className="mt-1 text-xs text-rose-500">{errors.bairro.message}</p>
          )}
        </Field>

        <Field label="Cidade" required>
          <input
            {...register("cidade")}
            className={inputCls}
            placeholder="Cidade"
          />
          {errors.cidade && (
            <p className="mt-1 text-xs text-rose-500">{errors.cidade.message}</p>
          )}
        </Field>

        <Field label="UF" required>
          <input
            {...register("uf")}
            className={inputCls}
            placeholder="UF"
            maxLength={2}
            style={{ textTransform: "uppercase" }}
          />
          {errors.uf && (
            <p className="mt-1 text-xs text-rose-500">{errors.uf.message}</p>
          )}
        </Field>
      </Section>

      {/* ── 4. Contato geral ── */}
      <Section icon={Phone} color="bg-amber-500" title="Contato geral" subtitle="Telefone e responsável pelo contato da unidade" cols={2}>
        <Field label="Telefone principal">
          <input
            {...register("telefone")}
            className={inputCls}
            placeholder="(00) 0000-0000"
          />
        </Field>

        <Field label="Pessoa de contato">
          <input
            {...register("contato")}
            className={inputCls}
            placeholder="Nome da pessoa de contato"
          />
        </Field>

        <Field label="Cargo do contato" span="2">
          <input
            {...register("cargo")}
            className={inputCls}
            placeholder="Ex: Gerente de Operações"
          />
        </Field>
      </Section>

      {/* ── 5. Contato de faturamento ── */}
      <Section icon={Mail} color="bg-violet-600" title="Contato de faturamento" subtitle="Responsável pelo setor de faturamento" cols={2}>
        <Field label="Nome do responsável" span="2">
          <input
            {...register("nome_contato_faturamento")}
            className={inputCls}
            placeholder="Nome completo"
          />
        </Field>

        <Field label="E-mail principal">
          <input
            {...register("email_contato_faturamento")}
            className={inputCls}
            placeholder="faturamento@clinica.com.br"
            type="email"
          />
          {errors.email_contato_faturamento && (
            <p className="mt-1 text-xs text-rose-500">{errors.email_contato_faturamento.message}</p>
          )}
        </Field>

        <Field label="E-mail secundário">
          <input
            {...register("email_contato_faturamento_secundario")}
            className={inputCls}
            placeholder="faturamento2@clinica.com.br"
            type="email"
          />
          {errors.email_contato_faturamento_secundario && (
            <p className="mt-1 text-xs text-rose-500">
              {errors.email_contato_faturamento_secundario.message}
            </p>
          )}
        </Field>

        <Field label="Telefone" span="2">
          <input
            {...register("telefone_contato_faturamento")}
            className={inputCls}
            placeholder="(00) 00000-0000"
          />
        </Field>
      </Section>

      {/* ── Rodapé ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-full border-slate-300 bg-white px-6 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gap-2 rounded-full bg-indigo-600 px-6 text-white hover:bg-indigo-700"
        >
          <Save className="h-4 w-4" />
          {isSubmitting
            ? "Salvando..."
            : clinica
            ? "Salvar alterações"
            : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
};

export default ClinicaForm;