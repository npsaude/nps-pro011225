-- Complemento da migração anterior: o EXECUTE residual das funções de recálculo
-- vinha do grant a PUBLIC (anon herda de PUBLIC). Revoga de PUBLIC e mantém
-- explicitamente authenticated (triggers invocados por usuários logados) e
-- service_role (edge functions).

REVOKE EXECUTE ON FUNCTION public.recalculate_faturamento_totals(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_faturamento_status(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_faturamento_aggregate(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recalculate_faturamento_totals(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_faturamento_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_faturamento_aggregate(uuid) TO authenticated, service_role;
