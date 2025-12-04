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
import type { HospitalInput, Hospital } from "@/services/hospitais-service";

const hospitalSchema = z.object({
  razao_social: z.string(),
  nome_fantasia: z.string(),
  nome_rede: z.string().optional(),
  cnpj: z.string(),
  endereco: z.string(),
  complemento: z.string().optional(),
  bairro: z.string(),
  cidade: z.string(),
  uf: z.string().max(2, "UF inválida."),
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

export type HospitalFormValues = z.infer<typeof hospitalSchema>;

interface HospitalFormProps {
  hospital?: Hospital | null;
  onSubmit: (values: HospitalInput) => Promise<void> | void;
  isSubmitting?: boolean;
}

const HospitalForm = ({
  hospital,
  onSubmit,
  isSubmitting,
}: HospitalFormProps) => {
  const form = useForm<HospitalFormValues>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: {
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
    if (hospital) {
      const mapped: HospitalFormValues = {
        razao_social: hospital.razao_social,
        nome_fantasia: hospital.nome_fantasia,
        nome_rede: hospital.nome_rede ?? "",
        cnpj: hospital.cnpj,
        endereco: hospital.endereco,
        complemento: hospital.complemento ?? "",
        bairro: hospital.bairro,
        cidade: hospital.cidade,
        uf: hospital.uf,
        telefone: hospital.telefone ?? "",
        contato: hospital.contato ?? "",
        cargo: hospital.cargo ?? "",
        nome_contato_faturamento: hospital.nome_contato_faturamento ?? "",
        email_contato_faturamento:
          hospital.email_contato_faturamento ?? "",
        telefone_contato_faturamento:
          hospital.telefone_contato_faturamento ?? "",
      };
      form.reset(mapped);
    }
  }, [hospital, form]);

  const handleSubmit = (values: HospitalFormValues) => {
    const payload: HospitalInput = {
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
        {/* Identificação */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="h-8 w-1 rounded-full bg-amber-500" />
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-slate-800">
                Identificação
              </h2>
              <p className="text-[11px] text-slate-500">
                Informe os dados principais do hospital.
              </p>
            </div>
          </header>

          <div className="space-y-4 px-5 py-4">
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
                          placeholder="Responsável pelo faturamento"
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
                          placeholder="faturamento@hospital.com.br"
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

export default HospitalForm;