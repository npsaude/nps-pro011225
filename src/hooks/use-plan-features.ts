import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlanFeatureKey =
  | "faturamento"
  | "conciliacao"
  | "recurso_de_glosa"
  | "menu_dashboard"
  | "menu_faturamento"
  | "menu_documentos_guia_solicitacao"
  | "menu_documentos_guia_autorizacao"
  | "menu_documentos_descricao_cirurgica"
  | "menu_documentos_guia_honorarios"
  | "menu_documentos_relatorio_repasse"
  | "menu_cadastro_clinicas_hospitais"
  | "menu_cadastro_medicos"
  | "menu_recursos"
  | "menu_mensagens"
  | "menu_configuracoes"
  | "menu_ajuda"
  | "menu_sair";

type PlanFeatures = Record<PlanFeatureKey, boolean>;

const ALL_FALSE: PlanFeatures = {
  faturamento: false,
  conciliacao: false,
  recurso_de_glosa: false,
  menu_dashboard: false,
  menu_faturamento: false,
  menu_documentos_guia_solicitacao: false,
  menu_documentos_guia_autorizacao: false,
  menu_documentos_descricao_cirurgica: false,
  menu_documentos_guia_honorarios: false,
  menu_documentos_relatorio_repasse: false,
  menu_cadastro_clinicas_hospitais: false,
  menu_cadastro_medicos: false,
  menu_recursos: false,
  menu_mensagens: false,
  menu_configuracoes: false,
  menu_ajuda: false,
  menu_sair: false,
};

async function fetchPlanFeatures(): Promise<PlanFeatures> {
  const { data: authData } = await supabase.auth.getUser();
  const email = authData.user?.email;
  if (!email) return ALL_FALSE;

  const { data, error } = await supabase
    .from("subscription_enrollments")
    .select("subscription_plans(features)")
    .eq("user_email", email.toLowerCase().trim())
    .in("status", ["ACTIVE", "TRIAL"])
    .eq("cancelado", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return ALL_FALSE;

  const raw = (data as any)?.subscription_plans?.features;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ALL_FALSE;

  return { ...ALL_FALSE, ...raw } as PlanFeatures;
}

export function usePlanFeatures() {
  const { data: features, isLoading } = useQuery({
    queryKey: ["plan-features"],
    queryFn: fetchPlanFeatures,
    // Permissões/recursos do plano precisam refletir rapidamente quando um
    // admin altera o plano. Mantemos um cache curto e revalidamos ao montar e
    // ao focar a aba, evitando que o usuário continue vendo itens bloqueados
    // (ou liberados) por minutos após a mudança do plano.
    staleTime: 1000 * 30, // 30 segundos
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const hasFeature = (key: PlanFeatureKey): boolean => {
    if (!features) return false;
    return features[key] === true;
  };

  return {
    features: features ?? ALL_FALSE,
    hasFeature,
    isLoading,
  };
}
