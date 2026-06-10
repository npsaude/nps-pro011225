-- 0016 — RPC pública para o vídeo do login (sem expor segredos)
--
-- app_settings guarda os tokens da OpenAI e do Asaas, mas as telas de login
-- (anônimas) só precisam do video_youtube. Esta RPC SECURITY DEFINER expõe
-- APENAS esse campo, permitindo restringir a tabela app_settings a super admin
-- (próxima etapa) sem quebrar o vídeo do login.

CREATE OR REPLACE FUNCTION public.get_login_video()
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT video_youtube FROM public.app_settings LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_login_video() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_login_video() TO anon, authenticated;
