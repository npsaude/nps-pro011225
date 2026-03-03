import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlanFeatures = {
  faturamento: boolean;
  documentos_guia_solicitacao: boolean;
  documentos_guia_autorizacao: boolean;
  documentos_descricao_cirurgica: boolean;
  documentos_guia_honorarios: boolean;
  documentos_relatorio_repasse: boolean;
  conciliacao: boolean;
  recurso_de_glosa: boolean;
};

const ALL_FALSE: PlanFeatures = {
  faturamento: false,
  documentos_guia_solicitacao: false,
  documentos_guia_autorizacao: false,
  documentos_descricao_cirurgica: false,
  documentos_guia_honorarios: false,
  documentos_relatorio_repasse: false,
  conciliacao: false,
  recurso_de_glosa: false,
};

async function fetchPlanFeatures(): Promise<PlanFeatures> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return ALL_FALSE;

  const { data, error } = await supabase
    .from("subscription_enrollments")
    .select("subscription_plans(features)")
    .eq("created_by", userId)
    .in("status", ["ACTIVE", "TRIAL"])
    .eq("cancelado", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return ALL_FALSE;

  const raw = (data as any)?.subscription_plans?.features;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ALL_FALSE;

  return {
    faturamento: Boolean(raw.faturamento),
    documentos_guia_solicitacao: Boolean(raw.documentos_guia_solicitacao),
    documentos_guia_autorizacao: Boolean(raw.documentos_guia_autorizacao),
    documentos_descricao_cirurgica: Boolean(raw.documentos_descricao_cirurgica),
    documentos_guia_honorarios: Boolean(raw.documentos_guia_honorarios),
    documentos_relatorio_repasse: Boolean(raw.documentos_relatorio_repasse),
    conciliacao: Boolean(raw.conciliacao),
    recurso_de_glosa: Boolean(raw.recurso_de_glosa),
  };
}

export function usePlanFeatures() {
  const { data, isLoading } = useQuery({
    queryKey: ["plan-features"],
    queryFn: fetchPlanFeatures,
    staleTime: 5 * 60 * 1000,
  });

  const features: PlanFeatures = data ?? ALL_FALSE;

  const hasFeature = (key: keyof PlanFeatures): boolean => features[key] ?? false;

  return { features, hasFeature, isLoading };
}
