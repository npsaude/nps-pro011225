import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
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

import type { SubscriptionPlan } from "@/services/subscription-plans-service";
import type {
  SubscriptionEnrollment,
  SubscriptionEnrollmentInput,
} from "@/services/subscription-enrollments-service";

const schema = z.object({
  user_name: z.string().min(2, "Informe o nome do assinante."),
  user_email: z.string().email("Informe um e-mail válido."),
  user_phone: z.string().optional(),
  plan_id: z.string().uuid("Selecione um plano."),
  status: z.string().min(1, "Informe o status (exatamente como no banco)."),
  payment_method: z.string().optional(),
  preencher_ids_asaas: z.boolean().default(false),
  asaas_customer_id: z.string().optional(),
  asaas_subscription_id: z.string().optional(),
});

type Values = z.infer<typeof schema>;

interface Props {
  plans: SubscriptionPlan[];
  enrollment?: SubscriptionEnrollment | null;
  isSubmitting?: boolean;
  onSubmit: (payload: SubscriptionEnrollmentInput) => Promise<void> | void;
}

export default function SubscriptionEnrollmentForm({
  plans,
  enrollment,
  isSubmitting,
  onSubmit,
}: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      user_name: "",
      user_email: "",
      user_phone: "",
      plan_id: "",
      status: "ACTIVE",
      payment_method: "",
      preencher_ids_asaas: false,
      asaas_customer_id: "",
      asaas_subscription_id: "",
    },
  });

  useEffect(() => {
    if (!enrollment) return;

    form.reset({
      user_name: enrollment.user_name ?? "",
      user_email: enrollment.user_email ?? "",
      user_phone: enrollment.user_phone ?? "",
      plan_id: enrollment.plan_id ?? "",
      status: String(enrollment.status ?? ""),
      payment_method: enrollment.payment_method ?? "",
      preencher_ids_asaas: Boolean(
        enrollment.asaas_customer_id || enrollment.asaas_subscription_id,
      ),
      asaas_customer_id: enrollment.asaas_customer_id ?? "",
      asaas_subscription_id: enrollment.asaas_subscription_id ?? "",
    });
  }, [enrollment, form]);

  const handleSubmit = (values: Values) => {
    const payload: SubscriptionEnrollmentInput = {
      plan_id: values.plan_id,
      user_name: values.user_name.trim(),
      user_email: values.user_email.trim(),
      user_phone: values.user_phone?.trim() || null,
      status: values.status.trim() as SubscriptionEnrollmentInput["status"],
      payment_method: values.payment_method?.trim() || null,

      asaas_customer_id: values.preencher_ids_asaas
        ? values.asaas_customer_id?.trim() || null
        : null,
      asaas_subscription_id: values.preencher_ids_asaas
        ? values.asaas_subscription_id?.trim() || null
        : null,

      current_period_start: enrollment?.current_period_start ?? null,
      current_period_end: enrollment?.current_period_end ?? null,
      started_at: enrollment?.started_at ?? null,
      ended_at: enrollment?.ended_at ?? null,
      last_payment_at: enrollment?.last_payment_at ?? null,
      metadata: enrollment?.metadata ?? null,
    };

    void onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="user_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input {...field} className="h-10" placeholder="Ex.: Adriano DAPV" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="user_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input {...field} className="h-10" placeholder="email@exemplo.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="user_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} className="h-10" placeholder="(11) 99999-9999" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="plan_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plano</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status (como no banco)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-10"
                    placeholder="Ex.: Ativo / ACTIVE"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="payment_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Método de pagamento (opcional)</FormLabel>
              <FormControl>
                <Input {...field} className="h-10" placeholder="PIX / BOLETO / CARTAO" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preencher_ids_asaas"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/40 p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-sm">Preencher IDs Asaas</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Use apenas se você precisar cadastrar manualmente.
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("preencher_ids_asaas") ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="asaas_customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asaas customer_id</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-10" placeholder="cus_..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="asaas_subscription_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asaas subscription_id</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-10" placeholder="sub_..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-full px-6"
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}