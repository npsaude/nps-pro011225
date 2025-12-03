import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
        className="space-y-4 text-xs sm:text-sm"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="razao_social"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Razão social</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Razão social completa" />
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
                  <Input {...field} placeholder="Nome fantasia" />
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
                  <Input {...field} placeholder="Ex: Rede Vida Saudável" />
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
                  <Input {...field} placeholder="00.000.000/0000-00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <FormField
            control={form.control}
            name="endereco"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Rua, número" />
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
                  <Input {...field} placeholder="Sala, bloco, referência" />
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
                  <Input {...field} placeholder="Bairro" />
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
                  <Input {...field} placeholder="Cidade" />
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
                    className="uppercase"
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
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone principal</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="(00) 0000-0000" />
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
                  <Input
                    {...field}
                    placeholder="Nome da pessoa de contato geral"
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
            name="cargo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo do contato principal</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ex: Coordenador administrativo"
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
                  <Input {...field} placeholder="Responsável pelo faturamento" />
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
                  <Input
                    {...field}
                    placeholder="faturamento@hospital.com.br"
                  />
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
                  <Input {...field} placeholder="(00) 00000-0000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-9 rounded-full px-5 text-xs sm:text-sm"
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default HospitalForm;