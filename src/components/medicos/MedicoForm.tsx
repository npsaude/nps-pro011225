import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, X } from "lucide-react";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { Medico, MedicoInput } from "@/services/medicos-service";
import type { Clinica } from "@/services/clinicas-service";

const medicoSchema = z.object({
  telefone_whatsapp: z
    .string()
    .min(5, "Informe um telefone válido.")
    .optional()
    .or(z.literal("")),
  crm: z.string().optional().or(z.literal("")),
  clinicas_ids: z.array(z.string()).min(1, "Selecione ao menos uma clínica."),
});

export type MedicoFormValues = z.infer<typeof medicoSchema>;

interface MedicoFormProps {
  medicoBase: {
    id: string;
    nome: string;
    email: string;
  };
  medicoExistente?: Medico | null;
  clinicas: Clinica[];
  onSubmit: (input: MedicoInput) => Promise<void> | void;
  isSubmitting?: boolean;
}

const MedicoForm = ({
  medicoBase,
  medicoExistente,
  clinicas,
  onSubmit,
  isSubmitting,
}: MedicoFormProps) => {
  const [clinicaSearch, setClinicaSearch] = useState("");
  const form = useForm<MedicoFormValues>({
    resolver: zodResolver(medicoSchema),
    defaultValues: {
      telefone_whatsapp: "",
      crm: "",
      clinicas_ids: [],
    },
  });

  useEffect(() => {
    if (medicoExistente) {
      form.reset({
        telefone_whatsapp: medicoExistente.telefone_whatsapp ?? "",
        crm: medicoExistente.crm ?? "",
        clinicas_ids: medicoExistente.clinicas_ids ?? [],
      });
    }
  }, [medicoExistente, form]);

  const clinicasMap = useMemo(() => {
    const map = new Map<string, Clinica>();
    clinicas.forEach((c) => map.set(c.id, c));
    return map;
  }, [clinicas]);

  const clinicasFiltradas = useMemo(() => {
    if (!clinicaSearch.trim()) return clinicas;
    const term = clinicaSearch.toLowerCase();
    return clinicas.filter((c) => {
      return (
        c.razao_social.toLowerCase().includes(term) ||
        c.nome_fantasia.toLowerCase().includes(term) ||
        (c.cidade ?? "").toLowerCase().includes(term)
      );
    });
  }, [clinicas, clinicaSearch]);

  const handleSubmit = (values: MedicoFormValues) => {
    const payload: MedicoInput = {
      id: medicoBase.id,
      nome: medicoBase.nome,
      email: medicoBase.email,
      telefone_whatsapp: values.telefone_whatsapp || null,
      crm: values.crm || null,
      clinicas_ids: values.clinicas_ids,
    };

    void onSubmit(payload);
  };

  const toggleClinica = (id: string) => {
    const current = form.getValues("clinicas_ids");
    if (current.includes(id)) {
      form.setValue(
        "clinicas_ids",
        current.filter((c) => c !== id),
        { shouldValidate: true },
      );
    } else {
      form.setValue("clinicas_ids", [...current, id], {
        shouldValidate: true,
      });
    }
  };

  const selectedClinicas = form.watch("clinicas_ids");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5 text-xs sm:text-sm"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <FormLabel>Nome (usuário médico)</FormLabel>
            <Input
              value={medicoBase.nome}
              disabled
              className="h-9 bg-slate-100 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            />
          </div>
          <div className="space-y-1.5">
            <FormLabel>E-mail (usuário médico)</FormLabel>
            <Input
              value={medicoBase.email}
              disabled
              className="h-9 bg-slate-100 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <FormField
            control={form.control}
            name="telefone_whatsapp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone (WhatsApp)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="+55 81 99999-9999"
                    className="h-9"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="crm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CRM</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="CRM do médico"
                    className="h-9 uppercase"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="clinicas_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Clínicas vinculadas</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex h-9 w-full items-center justify-between rounded-xl border-slate-200 bg-white px-3 text-left text-xs font-normal dark:border-slate-700 dark:bg-slate-900"
                  >
                    {field.value.length === 0 ? (
                      <span className="text-slate-400">
                        Selecione uma ou mais clínicas
                      </span>
                    ) : (
                      <span className="line-clamp-1 text-slate-700 dark:text-slate-200">
                        {field.value
                          .map((id) => clinicasMap.get(id)?.nome_fantasia)
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 text-xs sm:text-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Buscar por nome, razão social ou cidade..."
                        className="h-8 pl-8 text-xs"
                        value={clinicaSearch}
                        onChange={(e) => setClinicaSearch(e.target.value)}
                      />
                    </div>
                    {clinicaSearch && (
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200"
                        onClick={() => setClinicaSearch("")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="max-h-52 space-y-1 overflow-auto pt-1">
                    {clinicasFiltradas.length === 0 ? (
                      <p className="px-1 py-2 text-[11px] text-slate-400">
                        Nenhuma clínica encontrada.
                      </p>
                    ) : (
                      clinicasFiltradas.map((c) => {
                        const selected = field.value.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleClinica(c.id)}
                            className={`flex w-full flex-col rounded-xl px-2.5 py-2 text-left transition-colors ${
                              selected
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-100"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <span className="text-[13px] font-medium">
                              {c.nome_fantasia}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {c.razao_social}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {c.cidade} / {c.uf}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <FormMessage className="mt-1" />

              {selectedClinicas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedClinicas.map((id) => {
                    const c = clinicasMap.get(id);
                    if (!c) return null;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {c.nome_fantasia}
                        <button
                          type="button"
                          className="ml-0.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
                          onClick={() => toggleClinica(id)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-9 rounded-full px-5 text-xs sm:text-sm"
          >
            {isSubmitting ? "Salvando..." : "Salvar cadastro"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default MedicoForm;