import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, CreditCard } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cancelarAssinatura } from "@/services/subscription-cancel-service";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type Plan = {
  id: string;
  name: string;
  code: string;
  price_cents: number;
  features?: unknown;
};

type CurrentEnrollment = {
  id: string;
  plan_id: string;
  status: string | null;
  user_email: string;
  asaas_subscription_id: string | null;
  current_period_end: string | null;
  plan: {
    id?: string;
    name: string | null;
    code: string | null;
    price_cents: number | null;
    features?: unknown;
  } | null;
};

function formatBRLFromCents(cents?: number | null) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toFeaturesList(raw: unknown): string[] {
  if (!raw) return [];

  // Se for string JSON, tenta parsear
  let arr: unknown[] = [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === "object" && Array.isArray((raw as any).items)) {
    arr = (raw as any).items;
  }

  if (!arr.length) return [];

  return arr
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        // Suporta { text: "..." }, { label: "..." }, { name: "..." }
        const picked = obj.text ?? obj.label ?? obj.name ?? obj.title ?? obj.description;
        if (typeof picked === "string") return picked;
        // Fallback: se for objeto sem campo conhecido, ignora
        return "";
      }
      return "";
    })
    .filter(Boolean)
    .slice(0, 5);
}

export default function UserSubscriptionPanel() {
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<CurrentEnrollment | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const statusLabel = useMemo(
    () => enrollment?.status ?? "-",
    [enrollment?.status],
  );

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
        setPlans([]);
        setLoading(false);
        return;
      }

      const [
        { data: enrollmentData, error: enrollmentError },
        { data: plansData, error: plansError },
      ] = await Promise.all([
        // IMPORTANTE: sem filtro por email; o RLS já limita para "minhas inscrições"
        supabase
          .from("subscription_enrollments")
          .select(
            "id,plan_id,status,user_email,asaas_subscription_id,current_period_end,plan:subscription_plans(id,name,code,price_cents,features)",
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("subscription_plans")
          .select("id,name,code,price_cents,features,active")
          .eq("active", true)
          .order("price_cents", { ascending: true }),
      ]);

      if (enrollmentError) showError(enrollmentError.message);
      if (plansError) showError(plansError.message);

      const row = (enrollmentData as any) ?? null;
      let plan =
        Array.isArray(row?.plan) ? row.plan[0] ?? null : row?.plan ?? null;

      // Fallback: se o join não vier (por RLS/plan inativo), tenta buscar o plano pelo plan_id.
      if (row?.plan_id && !plan) {
        const { data: planRow, error: planErr } = await supabase
          .from("subscription_plans")
          .select("id,name,code,price_cents,features")
          .eq("id", row.plan_id)
          .maybeSingle();

        if (planErr) showError(planErr.message);
        plan = (planRow as any) ?? null;
      }

      setEnrollment(
        row
          ? {
              id: row.id,
              plan_id: row.plan_id,
              status: row.status ?? null,
              user_email: row.user_email,
              asaas_subscription_id: row.asaas_subscription_id ?? null,
              current_period_end: row.current_period_end ?? null,
              plan,
            }
          : null,
      );

      setPlans(
        ((plansData ?? []) as any[]).map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          price_cents: p.price_cents,
          features: p.features,
        })),
      );

      setLoading(false);
    };

    void load();
  }, []);

  const handleCancel = async () => {
    if (!enrollment) return;

    if (!enrollment.asaas_subscription_id) {
      showError(
        "Esta assinatura não possui vínculo com o Asaas (asaas_subscription_id vazio).",
      );
      return;
    }

    setCanceling(true);
    try {
      await cancelarAssinatura(enrollment.id);
      showSuccess("Assinatura cancelada com sucesso.");
      setEnrollment((prev) => (prev ? { ...prev, status: "CANCELED" } : prev));
      setConfirmOpen(false);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Não foi possível cancelar.");
    } finally {
      setCanceling(false);
    }
  };

  const handleRequestChangePlan = () => {
    showSuccess("Para alterar o plano, entre em contato com o suporte.");
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">
        Carregando assinatura...
      </div>
    );
  }

  const currentPlanId = enrollment?.plan?.id ?? null;
  const currentFeatures = toFeaturesList(enrollment?.plan?.features);

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border border-border bg-gradient-to-br from-[#112a66] via-[#10224f] to-[#0b1633] text-foreground shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <CreditCard className="h-4 w-4 text-primary" />
              Plano atual
            </div>

            <div className="text-2xl font-semibold text-foreground">
              {enrollment?.plan?.name ?? (enrollment ? "Plano não encontrado" : "Sem plano")}
            </div>

            <div className="text-xs text-muted-foreground">
              {enrollment?.current_period_end ? (
                <>
                  Vigência até{" "}
                  <span className="font-semibold text-foreground">
                    {new Date(enrollment.current_period_end).toLocaleDateString(
                      "pt-BR",
                    )}
                  </span>
                </>
              ) : (
                "Vigência não informada"
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {(currentFeatures.length
                ? currentFeatures
                : ["Suporte 24/7", "Acesso completo", "Gestão inteligente"]
              ).map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-foreground ring-1 ring-white/10"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="text-right">
              <div className="text-3xl font-semibold text-foreground">
                {formatBRLFromCents(enrollment?.plan?.price_cents)}
              </div>
              <div className="text-xs text-muted-foreground">por mês</div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-11 rounded-2xl bg-white px-5 text-xs font-semibold text-slate-900 hover:bg-white/90"
                onClick={() => setConfirmOpen(true)}
                disabled={
                  canceling || statusLabel.toUpperCase().includes("CANCEL")
                }
              >
                Gerenciar assinatura
              </Button>
            </div>

            <Badge className="bg-white/10 text-foreground ring-1 ring-white/10">
              Status: {statusLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-primary" />
        <div className="text-base font-semibold text-foreground">
          Alterar seu Plano
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = currentPlanId && p.id === currentPlanId;
          const features = toFeaturesList(p.features);
          return (
            <Card
              key={p.id}
              className={`rounded-3xl border ${
                isCurrent
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-border"
              } bg-card/80`}
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground">
                    {p.name}
                  </div>
                  {isCurrent ? (
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/20">
                      Atual
                    </span>
                  ) : null}
                </div>

                <div className="text-2xl font-semibold text-foreground">
                  {formatBRLFromCents(p.price_cents)}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">
                    / mês
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {(features.length
                    ? features
                    : ["Benefício do plano", "Benefício do plano", "Benefício do plano"]
                  ).map((f) => (
                    <div
                      key={f}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/15">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  className={`mt-2 h-11 w-full rounded-2xl ${
                    isCurrent
                      ? "bg-secondary text-secondary-foreground ring-1 ring-border"
                      : "bg-primary text-primary-foreground"
                  }`}
                  onClick={isCurrent ? undefined : handleRequestChangePlan}
                  disabled={isCurrent}
                >
                  {isCurrent ? "Plano Atual" : "Selecionar Plano"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Confirmar cancelamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este cancelamento será enviado ao Asaas e a assinatura ficará com
              status "CANCELED" no sistema.
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
              <Ban className="mr-2 h-4 w-4" />
              {canceling ? "Cancelando..." : "Cancelar assinatura"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}