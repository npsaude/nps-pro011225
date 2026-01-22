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

type CurrentEnrollment = {
  id: string;
  plan_id: string;
  status: string | null;
  user_email: string;
  asaas_subscription_id: string | null;
  current_period_end: string | null;
  plan: {
    id: string;
    name: string;
    code: string;
    price_cents: number;
    features?: unknown;
  } | null;
};

function formatBRLFromCents(cents?: number | null) {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toFeaturesList(raw: unknown): string[] {
  if (!raw) return [];

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
        const picked = obj.text ?? obj.label ?? obj.name ?? obj.title ?? obj.description;
        if (typeof picked === "string") return picked;
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const statusLabel = useMemo(
    () => enrollment?.status ?? "-",
    [enrollment?.status],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        // Verificar autenticação
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error("[UserSubscriptionPanel] Erro ao obter usuário:", authError);
          showError("Erro ao verificar autenticação: " + authError.message);
          setLoading(false);
          return;
        }

        if (!authData.user?.email) {
          console.warn("[UserSubscriptionPanel] Usuário não autenticado ou sem email");
          setEnrollment(null);
          setLoading(false);
          return;
        }

        const userEmail = authData.user.email.trim().toLowerCase();
        console.log("[UserSubscriptionPanel] Buscando assinatura para:", userEmail);

        // Buscar assinatura usando a mesma lógica da query SQL que funciona
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from("subscription_enrollments")
          .select(`
            id,
            plan_id,
            status,
            user_email,
            asaas_subscription_id,
            current_period_end,
            plan:plan_id (
              id,
              name,
              code,
              price_cents,
              features
            )
          `)
          .ilike("user_email", userEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (enrollmentError) {
          console.error("[UserSubscriptionPanel] Erro ao buscar assinatura:", enrollmentError);
          showError("Erro ao carregar assinatura: " + enrollmentError.message);
        } else {
          console.log("[UserSubscriptionPanel] Dados retornados:", enrollmentData);
        }

        // Processar dados da assinatura
        if (enrollmentData) {
          // O Supabase pode retornar plan como array, então pegamos o primeiro elemento
          const rawPlan = enrollmentData.plan;
          const planData = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
          
          setEnrollment({
            id: enrollmentData.id,
            plan_id: enrollmentData.plan_id,
            status: enrollmentData.status ?? null,
            user_email: enrollmentData.user_email,
            asaas_subscription_id: enrollmentData.asaas_subscription_id ?? null,
            current_period_end: enrollmentData.current_period_end ?? null,
            plan: planData ? {
              id: planData.id,
              name: planData.name,
              code: planData.code,
              price_cents: planData.price_cents,
              features: planData.features,
            } : null,
          });
        } else {
          setEnrollment(null);
        }
      } catch (error) {
        console.error("[UserSubscriptionPanel] Erro inesperado:", error);
        showError("Erro inesperado ao carregar dados de assinatura");
      } finally {
        setLoading(false);
      }
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

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">
        Carregando assinatura...
      </div>
    );
  }

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
                Cancelar inscrição
              </Button>
            </div>

            <Badge className="bg-white/10 text-foreground ring-1 ring-white/10">
              Status: {statusLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Confirmar cancelamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este cancelamento será enviado ao Asaas e sua inscrição ficará
              marcada como cancelada no sistema.
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
              {canceling ? "Cancelando..." : "Cancelar inscrição"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}