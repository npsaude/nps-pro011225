import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, CreditCard } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cancelarAssinatura } from "@/services/subscription-cancel-service";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CurrentEnrollment = {
  id: string;
  status: string | null;
  user_email: string;
  asaas_subscription_id: string | null;
  current_period_end: string | null;
  plan: { name: string | null; code: string | null; price_cents: number | null } | null;
};

function formatBRLFromCents(cents?: number | null) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function UserSubscriptionPanel() {
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<CurrentEnrollment | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const statusLabel = useMemo(() => {
    return enrollment?.status ?? "-";
  }, [enrollment?.status]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        showError(authError.message);
        setLoading(false);
        return;
      }

      const email = authData.user?.email?.trim();
      if (!email) {
        setEnrollment(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("subscription_enrollments")
        .select(
          "id,status,user_email,asaas_subscription_id,current_period_end,plan:subscription_plans(name,code,price_cents)",
        )
        .ilike("user_email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        showError(error.message);
        setLoading(false);
        return;
      }

      const row = (data as any) ?? null;

      const plan = Array.isArray(row?.plan) ? row.plan[0] ?? null : row?.plan ?? null;

      setEnrollment(
        row
          ? {
              id: row.id,
              status: row.status ?? null,
              user_email: row.user_email,
              asaas_subscription_id: row.asaas_subscription_id ?? null,
              current_period_end: row.current_period_end ?? null,
              plan,
            }
          : null,
      );
      setLoading(false);
    };

    void load();
  }, []);

  const handleCancel = async () => {
    if (!enrollment) return;

    if (!enrollment.asaas_subscription_id) {
      showError("Esta assinatura não possui vínculo com o Asaas (asaas_subscription_id vazio).");
      return;
    }

    setCanceling(true);
    try {
      await cancelarAssinatura(enrollment.id);
      showSuccess("Assinatura cancelada com sucesso.");
      setEnrollment((prev) =>
        prev ? { ...prev, status: "CANCELED" } : prev,
      );
      setConfirmOpen(false);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Não foi possível cancelar.");
    } finally {
      setCanceling(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-border bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/15">
            <CreditCard className="h-4 w-4" />
          </span>
          Assinatura
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando assinatura...</div>
        ) : !enrollment ? (
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            Nenhuma assinatura encontrada para este usuário.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-secondary/20 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Plano
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {enrollment.plan?.name ?? "—"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {enrollment.plan?.code ?? ""}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Status
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {statusLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Valor
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {formatBRLFromCents(enrollment.plan?.price_cents)}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                {enrollment.current_period_end ? (
                  <span>
                    Vigência até{" "}
                    <span className="font-semibold text-foreground">
                      {new Date(enrollment.current_period_end).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                ) : (
                  <span>Vigência: não informada</span>
                )}
              </div>

              <Button
                type="button"
                variant="destructive"
                className="h-10 rounded-full px-5"
                onClick={() => setConfirmOpen(true)}
                disabled={canceling || statusLabel.toUpperCase().includes("CANCEL")}
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancelar assinatura
              </Button>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Confirmar cancelamento
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Este cancelamento será enviado ao Asaas e a assinatura ficará com status “CANCELED” no sistema.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={canceling}>Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      void handleCancel();
                    }}
                    disabled={canceling}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {canceling ? "Cancelando..." : "Confirmar cancelamento"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}