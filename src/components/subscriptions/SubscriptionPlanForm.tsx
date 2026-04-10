import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  BillingInterval,
  SubscriptionPlan,
  SubscriptionPlanInput,
} from "@/services/subscription-plans-service";

const toInt = (value: unknown) => {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const toMoney = (value: unknown) => {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
};

const planSchema = z.object({
  name: z.string().min(1, "Informe o nome do plano."),
  code: z
    .string()
    .min(1, "Informe o código do plano.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, números, _ ou -."),
  description: z.string().optional(),
  price_month: z.preprocess(toMoney, z.number().min(0, "Preço mensal inválido.")),
  price_annual: z.preprocess(toMoney, z.number().min(0, "Preço anual inválido.")),
  currency: z.string().min(1),
  billing_interval: z.enum([
    "WEEKLY",
    "BIWEEKLY",
    "MONTHLY",
    "QUARTERLY",
    "SEMIANNUALLY",
    "YEARLY",
  ]),
  interval_count: z.preprocess(toInt, z.number().min(1, "Mínimo 1.")),
  external_plan_id: z.string().optional(),
  active: z.boolean(),
});

export type SubscriptionPlanFormValues = z.infer<typeof planSchema>;

interface SubscriptionPlanFormProps {
  plan?: SubscriptionPlan | null;
  onSubmit: (values: SubscriptionPlanInput) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function SubscriptionPlanForm({
  plan,
  onSubmit,
  isSubmitting,
}: SubscriptionPlanFormProps) {
  const form = useForm<SubscriptionPlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      price_month: 0,
      price_annual: 0,
      currency: "BRL",
      billing_interval: "MONTHLY",
      interval_count: 1,
      external_plan_id: "",
      active: true,
    },
  });

  useEffect(() => {
    if (!plan) return;

    form.reset({
      name: plan.name,
      code: plan.code,
      description: plan.description ?? "",
      price_month: plan.price_month ?? 0,
      price_annual: plan.price_annual ?? 0,
      currency: plan.currency ?? "BRL",
      billing_interval: plan.billing_interval as BillingInterval,
      interval_count: plan.interval_count ?? 1,
      external_plan_id: plan.external_plan_id ?? "",
      active: Boolean(plan.active),
    });
  }, [plan, form]);

  const handleSubmit = (values: SubscriptionPlanFormValues) => {
    const payload: SubscriptionPlanInput = {
      name: values.name.trim(),
      code: values.code.trim(),
      description: values.description?.trim() || null,
      price_month: values.price_month ?? 0,
      price_annual: values.price_annual ?? 0,
      currency: values.currency,
      billing_interval: values.billing_interval as BillingInterval,
      interval_count: values.interval_count,
      external_plan_id: values.external_plan_id?.trim() || null,
      setup_fee_cents: 0,
      trial_days: 0,
      metadata: null,
      active: values.active,
    };

    void onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form
        className="space-y-5 text-xs sm:text-sm"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do plano</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex.: Profissional" className="h-10" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código (interno)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex.: PRO_MENSAL" className="h-10" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Resumo do que o plano inclui (opcional)"
                  className="min-h-[88px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="price_month"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço mensal (R$)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price_annual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço anual (R$)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="billing_interval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recorrência</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Semanal</SelectItem>
                      <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                      <SelectItem value="SEMIANNUALLY">Semestral</SelectItem>
                      <SelectItem value="YEARLY">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interval_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>A cada (n)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="1" step="1" className="h-10" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="external_plan_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID externo (Asaas)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Opcional"
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-0.5">
                  <FormLabel className="text-xs font-semibold">Plano ativo</FormLabel>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Exibe/permite uso do plano nas inscrições.
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-full px-6 text-xs sm:text-sm"
            >
              {isSubmitting ? "Salvando..." : "Salvar plano"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
