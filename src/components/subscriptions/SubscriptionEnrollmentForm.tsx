import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  SubscriptionEnrollmentStatus,
} from "@/services/subscription-enrollments-service";

const enrollmentSchema = z.object({
  plan_id: z.string().uuid("Selecione um plano."),
  user_name: z.string().min(2, "Informe o nome do assinante."),
  user_email: z.string().email("Informe um e-mail válido."),
  user_phone: z.string().optional(),
  status: z.enum(["PENDING", "TRIAL", "ACTIVE", "PAUSED", "CANCELED", "FAILED"]),
  payment_method: z.string().optional(),
});

export type SubscriptionEnrollmentFormValues = z.infer<typeof enrollmentSchema>;

interface Props {
  enrollment?: SubscriptionEnrollment | null;
  plans: SubscriptionPlan[];
  onSubmit: (values: SubscriptionEnrollmentInput) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function SubscriptionEnrollmentForm({
  enrollment,
  plans,
  onSubmit,
  isSubmitting,
}: Props) {
  const form = useForm<SubscriptionEnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      plan_id: "",
      user_name: "",
      user_email: "",
      user_phone: "",
      status: "PENDING",
      payment_method: "PIX",
    },
  });

  useEffect(() => {
    if (!enrollment) return;

    form.reset({
      plan_id: enrollment.plan_id,
      user_name: enrollment.user_name ?? "",
      user_email: enrollment.user_email ?? "",
      user_phone: enrollment.user_phone ?? "",
      status: enrollment.status as SubscriptionEnrollmentStatus,
      payment_method: enrollment.payment_method ?? "",
    });
  }, [enrollment, form]);

  const handleSubmit = (values: SubscriptionEnrollmentFormValues) => {
    const payload: SubscriptionEnrollmentInput = {
      plan_id: values.plan_id,
      user_name: values.user_name.trim(),
      user_email: values.user_email.trim(),
      user_phone: values.user_phone?.trim() || null,
      status: values.status as SubscriptionEnrollmentStatus,
      payment_method: values.payment_method?.trim() || null,

      // Mantemos datas como null neste cadastro manual (podem ser atualizadas via webhook)
      current_period_start: null,
      current_period_end: null,
      started_at: null,
      ended_at: null,
      last_payment_at: null,

      // IDs Asaas (opcional, caso o super_admin queira preencher)
      asaas_subscription_id: (enrollment?.asaas_subscription_id ?? null) as any,
      asaas_customer_id: (enrollment?.asaas_customer_id ?? null) as any,
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
            name="user_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do assinante</FormLabel>
                <FormControl>
                  <Input {...field} className="h-10" placeholder="Ex.: João da Silva" />
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
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="TRIAL">Trial</SelectItem>
                      <SelectItem value="ACTIVE">Ativa</SelectItem>
                      <SelectItem value="PAUSED">Pausada</SelectItem>
                      <SelectItem value="CANCELED">Cancelada</SelectItem>
                      <SelectItem value="FAILED">Falhou</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Input {...field} className="h-10" placeholder="PIX, BOLETO, CREDIT_CARD..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-full px-6 text-xs sm:text-sm"
          >
            {isSubmitting ? "Salvando..." : "Salvar assinante"}
          </Button>
        </div>
      </form>
    </Form>
  );
}