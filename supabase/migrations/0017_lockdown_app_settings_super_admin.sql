-- Lockdown de app_settings: a tabela guarda segredos (tokens OpenAI/Asaas) e
-- estava aberta a qualquer um (policy ALL/public/true + policies authenticated/true).
-- O vídeo do login (único uso anônimo) já é servido pela RPC get_login_video()
-- (SECURITY DEFINER), então o acesso direto fica restrito a super admins.
-- Edge functions usam service role e não passam por RLS.

DROP POLICY IF EXISTS "NPSaude" ON public.app_settings;
DROP POLICY IF EXISTS app_settings_select_authenticated ON public.app_settings;
DROP POLICY IF EXISTS app_settings_insert_authenticated ON public.app_settings;
DROP POLICY IF EXISTS app_settings_update_authenticated ON public.app_settings;
DROP POLICY IF EXISTS app_settings_delete_authenticated ON public.app_settings;

CREATE POLICY app_settings_select_super_admin ON public.app_settings
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY app_settings_insert_super_admin ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY app_settings_update_super_admin ON public.app_settings
  FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY app_settings_delete_super_admin ON public.app_settings
  FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));
