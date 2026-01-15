CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_sistema u
    JOIN auth.users au
      ON lower(au.email) = lower(u.email)
    WHERE au.id = p_user_id
      AND u.ativo = true
      AND lower(u.regra) = 'super_admin'
  );
$function$;