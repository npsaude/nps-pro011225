-- Fecha RPCs SECURITY DEFINER que estavam expostas via /rest/v1/rpc a qualquer
-- pessoa com a anon key (que é pública, embutida no bundle do front):
--
-- - purge_user_everything: DESTRUTIVA — apaga todos os dados de um usuário pelo
--   e-mail. Só a edge function purge-user (service role) deve chamá-la.
-- - list_storage_objects_for_user: lista os arquivos de Storage de qualquer
--   usuário. Só a edge function purge-user (service role) usa.
-- - recalculate_*/sync_faturamento_aggregate: internas de recálculo; não há
--   motivo para anônimos executarem.
--
-- is_super_admin e get_login_video permanecem como estão: a primeira é usada
-- nas policies de RLS e por edge functions com o JWT do usuário; a segunda é
-- intencionalmente pública (vídeo da tela de login).

REVOKE EXECUTE ON FUNCTION public.purge_user_everything(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_storage_objects_for_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_user_everything(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_storage_objects_for_user(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.recalculate_faturamento_totals(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_faturamento_status(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_faturamento_aggregate(uuid) FROM anon;
