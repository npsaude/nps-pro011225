import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  MapPin,
  Phone,
  User,
  Mail,
  Building2,
  Hash,
  FileText,
  Network,
  Landmark,
  Home,
  Navigation,
  Globe,
  Briefcase,
  CreditCard,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormField,
  FormMessage,
} from "@/components/ui/form";
import type {
  ClinicaInput,
  Clinica,
  TipoUnidade,
} from "@/services/clinicas-service";

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
  telefone_contato_faturamento: z.string().optional(),
});

export type ClinicaFormValues = z.infer<typeof clinicaSchema>;

interface ClinicaFormProps {
  clinica?: Clinica | null;
  onSubmit: (values: ClinicaInput) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const ClinicaForm = ({ clinica, onSubmit, onCancel, isSubmitting }: ClinicaFormProps) => {
  const form = useForm<ClinicaFormValues>({
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
      telefone_contato_faturamento: "",
    },
  });

  useEffect(() => {
    if (clinica) {
      const mapped: ClinicaFormValues = {
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
        telefone_contato_faturamento: clinica.telefone_contato_faturamento ?? "",
      };
      form.reset(mapped);
    }
  }, [clinica, form]);

  const handleSubmit = (values: ClinicaFormValues) => {
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
      telefone_contato_faturamento: values.telefone_contato_faturamento || null,
    };

    void onSubmit(payload);
  };

  const tipoUnidade = form.watch("tipo_unidade");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5"
      >
        {/* ── Seção 1: Tipo de Unidade ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Building2 className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Tipo de unidade</h3>
              <p className="text-[11px] text-slate-400">Selecione se é uma clínica ou hospital</p>
            </div>
          </div>

          <div className="px-5 py-4">
            <FormField
              control={form.control}
              name="tipo_unidade"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => field.onChange("CLINICA")}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                          tipoUnidade === "CLINICA"
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                          tipoUnidade === "CLINICA" ? "bg-indigo-100" : "bg-slate-100"
                        }`}>
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">Clínica</p>
                          <p className="text-[11px] opacity-70">Unidade ambulatorial</p>
                        </div>
                        {tipoUnidade === "CLINICA" && (
                          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => field.onChange("HOSPITAL")}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all ${
                          tipoUnidade === "HOSPITAL"
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                          tipoUnidade === "HOSPITAL" ? "bg-indigo-100" : "bg-slate-100"
                        }`}>
                          <Landmark className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">Hospital</p>
                          <p className="text-[11px] opacity-70">Unidade hospitalar</p>
                        </div>
                        {tipoUnidade === "HOSPITAL" && (
                          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── Seção 2: Identificação ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <FileText className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Identificação</h3>
              <p className="text-[11px] text-slate-400">Dados cadastrais da unidade</p>
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            {/* Razão social + Nome fantasia */}
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="razao_social"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">Razão social <span className="text-red-400">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          {...field}
                          placeholder="Razão social completa"
                          className="h-10 pl-9 text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome_fantasia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">Nome fantasia <span className="text-red-400">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Building2 className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          {...field}
                          placeholder="Nome fantasia"
                          className="h-10 pl-9 text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* CNPJ + Cód. GOT */}
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">CNPJ <span className="text-red-400">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <CreditCard className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          {...field}
                          placeholder="00.000.000/0000-00"
                          className="h-10 pl-9 text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo_referencial_got"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">Cód. Referencial (GOT)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Hash className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          {...field}
                          placeholder="Ex: GOT-001"
                          className="h-10 pl-9 text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Nome da rede */}
            <FormField
              control={form.control}
              name="nome_rede"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-slate-600">Nome da rede</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Network className="h-3.5 w-3.5" />
                      </span>
                      <Input
                        {...field}
                        placeholder="Ex: Rede Vida Saudável"
                        className="h-10 pl-9 text-sm"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── Seção 3: Localização ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <MapPin className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Localização</h3>
              <p className="text-[11px] text-slate-400">Endereço completo da unidade</p>
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            {/* Endereço + Complemento */}
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">Endereço <span className="text-red-400">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Home className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          {...field}
                          placeholder="Rua, número"
                          className="h-10 pl-9 text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="complemento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">Complemento</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Sala, bloco..."
                        className="h-10 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bairro + Cidade + UF */}
            <div className="grid gap-3 sm:grid-cols-[1.2fr_1.2fr_0.5fr]">
              <FormField
                control={form.control}
                name="bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">Bairro <span className="text-red-400">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Navigation className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          {...field}
                          placeholder="Bairro"
                          className="h-10 pl-9 text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">Cidade <span className="text-red-400">*</span></FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Globe className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          {...field}
                          placeholder="Cidade"
                          className="h-10 pl-9 text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="uf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">UF <span className="text-red-400">*</span></FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="UF"
                        maxLength={2}
                        className="h-10 uppercase text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* ── Seção 4: Contato Geral ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Phone className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Contato geral</h3>
              <p className="text-[11px] text-slate-400">Telefone e responsável pelo contato da unidade</p>
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">Telefone principal</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Phone className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          {...field}
                          placeholder="(00) 0000-0000"
                          className="h-10 pl-9 text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">Pessoa de contato</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <User className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          {...field}
                          placeholder="Nome da pessoa de contato"
                          className="h-10 pl-9 text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cargo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-slate-600">Cargo do contato</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Briefcase className="h-3.5 w-3.5" />
                      </span>
                      <Input
                        {...field}
                        placeholder="Ex: Gerente de Operações"
                        className="h-10 pl-9 text-sm"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── Seção 5: Contato de Faturamento ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Mail className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Contato de faturamento</h3>
              <p className="text-[11px] text-slate-400">Responsável pelo setor de faturamento</p>
            </div>
          </div>

          <div className="space-y-4 px-5 py-4">
            <FormField
              control={form.control}
              name="nome_contato_faturamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-slate-600">Nome do responsável</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User className="h-3.5 w-3.5" />
                      </span>
                      <Input
                        {...field}
                        placeholder="Nome completo"
                        className="h-10 pl-9 text-sm"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email_contato_faturamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">E-mail</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Mail className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          {...field}
                          placeholder="faturamento@clinica.com.br"
                          className="h-10 pl-9 text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone_contato_faturamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">Telefone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Phone className="h-3.5 w-3.5" />
                        </span>
                        <Input
                          {...field}
                          placeholder="(00) 00000-0000"
                          className="h-10 pl-9 text-sm"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* ── Ações ── */}
        <div className="flex items-center justify-end gap-3 pt-1 pb-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-10 rounded-full px-6 text-sm"
            >
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-full bg-indigo-600 px-8 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Salvando...
              </span>
            ) : clinica ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ClinicaForm;
