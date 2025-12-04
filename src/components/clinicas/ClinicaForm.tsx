import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Phone, User, Mail } from "lucide-react";

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
  isSubmitting?: boolean;
}

const ClinicaForm = ({ clinica, onSubmit, isSubmitting }: ClinicaFormProps) => {
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
        email_contato_faturamento:
          clinica.email_contato_faturamento ?? "",
        telefone_contato_faturamento:
          clinica.telefone_contato_faturamento ?? "",
      };
      form.reset(mapped);
    }
  }, [clinica, form]);

  const handleSubmit = (values: ClinicaFormValues) => {
    const payload: ClinicaInput = {
      tipo_unidade: values.tipo_unidade as TipoUnidade,
      codigo_referencial_got:
        values.codigo_referencial_got?.trim() || null,
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
      nome_contato_faturamento:
        values.nome_contato_faturamento || null,
      email_contato_faturamento:
        values.email_contato_faturamento || null,
      telefone_contato_faturamento:
        values.telefone_contato_faturamento || null,
    };

    void onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 text-xs sm:text-sm"
      >
        {/* Identificação da unidade */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="h-8 w-1 rounded-full bg-amber-500" />
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-slate-800">
                Identificação
              </h2>
              <p className="text-[11px] text-slate-500">
                Selecione o tipo de unidade e informe os dados principais.
              </p>
            </div>
          </header>

          <div className="space-y-4 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
              <FormField
                control={form.control}
                name="tipo_unidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de unidade</FormLabel>
                    <FormControl>
                      <div className="inline-flex w-full flex-wrap gap-2 rounded-full bg-slate-100 p-1 text-xs sm:text-sm">
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            field.value === "CLINICA" ? "default" : "outline"
                          }
                          className={`flex-1 rounded-full ${
                            field.value === "CLINICA"
                              ? "bg-slate-900 text-slate-50 hover:bg-slate-800"
                              : "bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                          onClick={() => field.onChange("CLINICA")}
                        >
                          Clínica
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            field.value === "HOSPITAL" ? "default" : "outline"
                          }
                          className={`flex-1 rounded-full ${
                            field.value === "HOSPITAL"
                              ? "bg-slate-900 text-slate-50 hover:bg-slate-800"
                              : "bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                          onClick={() => field.onChange("HOSPITAL")}
                        >
                          Hospital
                        </Button>
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
                    <FormLabel>Cód. Referencial (GOT)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: GOT-001"
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="razao_social"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razão social</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Razão social completa"
                        className="h-10"
                      />
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
                    <FormLabel>Nome fantasia</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nome fantasia"
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nome_rede"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da rede</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Rede Vida Saudável"
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="00.000.000/0000-00"
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </section>

        {/* Localização */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="h-8 w-1 rounded-full bg-amber-500" />
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-slate-800">
                Localização
              </h2>
            </div>
          </header>

          <div className="space-y-4 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <Input
                          {...field}
                          placeholder="Rua, número"
                          className="h-10 pl-9"
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
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Sala, bloco, referência"
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.1fr_1.1fr_0.5fr]">
              <FormField
                control={form.control}
                name="bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Bairro"
                        className="h-10"
                      />
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
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Cidade"
                        className="h-10"
                      />
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
                    <FormLabel>UF</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="UF"
                        maxLength={2}
                        className="h-10 uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </section>

        {/* Contato e Faturamento */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="h-8 w-1 rounded-full bg-amber-500" />
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-slate-800">
                Contato e Faturamento
              </h2>
            </div>
          </header>

          <div className="space-y-4 px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone principal</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Phone className="h-4 w-4" />
                        </span>
                        <Input
                          {...field}
                          placeholder="(00) 0000-0000"
                          className="h-10 pl-9"
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
                    <FormLabel>Contato principal</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <User className="h-4 w-4" />
                        </span>
                        <Input
                          {...field}
                          placeholder="Nome da pessoa de contato geral"
                          className="h-10 pl-9"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo do contato principal</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Gerente de Operações"
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome_contato_faturamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do contato de faturamento</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <User className="h-4 w-4" />
                        </span>
                        <Input
                          {...field}
                          placeholder="Ana Paula"
                          className="h-10 pl-9"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email_contato_faturamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail do faturamento</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Mail className="h-4 w-4" />
                        </span>
                        <Input
                          {...field}
                          placeholder="faturamento@clinica.com.br"
                          className="h-10 pl-9"
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
                    <FormLabel>Telefone do faturamento</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Phone className="h-4 w-4" />
                        </span>
                        <Input
                          {...field}
                          placeholder="(00) 00000-0000"
                          className="h-10 pl-9"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-full px-6 text-xs sm:text-sm"
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ClinicaForm;