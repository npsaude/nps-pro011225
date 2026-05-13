-- ============================================================
-- SCRIPT: Funções e Triggers ausentes no projeto pokyribuibmbeorrcsgk
-- Execute este script no Supabase Console do projeto ANTIGO:
-- https://supabase.com/dashboard/project/pokyribuibmbeorrcsgk/sql
-- ============================================================

-- 1. normalize_email
CREATE OR REPLACE FUNCTION public.normalize_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT lower(trim(coalesce(p_email, '')))
$function$;

-- 2. current_user_email
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
AS $function$
  SELECT lower(trim(coalesce(auth.jwt() ->> 'email', '')))
$function$;

-- 3. is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_sistema u
    JOIN auth.users au
      ON lower(trim(au.email)) = lower(trim(u.email))
    WHERE au.id = p_user_id
      AND u.ativo = true
      AND lower(trim(u.regra)) = 'super_admin'
  );
$function$;

-- 4. set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- 5. sync_faturamento_aggregate
CREATE OR REPLACE FUNCTION public.sync_faturamento_aggregate(p_faturamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.recalculate_faturamento_totals(p_faturamento_id);
  PERFORM public.recalculate_faturamento_status(p_faturamento_id);
END;
$function$;

-- 6. recalculate_faturamento_totals
CREATE OR REPLACE FUNCTION public.recalculate_faturamento_totals(p_faturamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_faturado numeric(10,2);
  v_total_glosa numeric(10,2);
  v_total_desconto numeric(10,2);
  v_total_liquido numeric(10,2);
  v_total_repasse numeric(10,2);
BEGIN
  SELECT
    COALESCE(SUM(i.valor_faturado), 0),
    COALESCE(SUM(i.valor_glosa), 0),
    COALESCE(SUM(i.valor_desconto), 0),
    COALESCE(SUM(i.valor_liquido), 0),
    COALESCE(SUM(i.valor_repasse), 0)
  INTO v_total_faturado, v_total_glosa, v_total_desconto, v_total_liquido, v_total_repasse
  FROM public.itens_faturamento i
  WHERE i.faturamento_id = p_faturamento_id;

  UPDATE public.faturamentos f
  SET valor_total_faturado = v_total_faturado,
      valor_total_glosa = v_total_glosa,
      valor_total_desconto = v_total_desconto,
      valor_total_liquido = v_total_liquido,
      valor_total_repasse = v_total_repasse,
      updated_at = now()
  WHERE f.id = p_faturamento_id;
END;
$function$;

-- 7. recalculate_faturamento_status
CREATE OR REPLACE FUNCTION public.recalculate_faturamento_status(p_faturamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_itens integer;
  v_pendentes integer;
  v_pago_integral integer;
  v_glosado_total integer;
  v_status text;
BEGIN
  SELECT COUNT(*) INTO v_total_itens
  FROM public.itens_faturamento i
  WHERE i.faturamento_id = p_faturamento_id;

  IF v_total_itens = 0 THEN
    v_status := 'pendente';
  ELSE
    SELECT
      SUM(CASE WHEN i.status_item = 'pendente' THEN 1 ELSE 0 END),
      SUM(CASE WHEN i.status_item = 'pago_integral' THEN 1 ELSE 0 END),
      SUM(CASE WHEN i.status_item = 'glosado_total' THEN 1 ELSE 0 END)
    INTO v_pendentes, v_pago_integral, v_glosado_total
    FROM public.itens_faturamento i
    WHERE i.faturamento_id = p_faturamento_id;

    IF COALESCE(v_pendentes,0) = v_total_itens THEN
      v_status := 'pendente';
    ELSIF COALESCE(v_pago_integral,0) = v_total_itens THEN
      v_status := 'pago_integral';
    ELSIF COALESCE(v_glosado_total,0) = v_total_itens THEN
      v_status := 'glosado';
    ELSE
      v_status := 'pago_parcial';
    END IF;
  END IF;

  UPDATE public.faturamentos f
  SET status_pagamento = v_status::faturamento_status_pagamento,
      updated_at = now()
  WHERE f.id = p_faturamento_id;
END;
$function$;

-- 8. itens_faturamento_after_change (trigger function)
CREATE OR REPLACE FUNCTION public.itens_faturamento_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_faturamento_id uuid;
BEGIN
  v_faturamento_id := COALESCE(NEW.faturamento_id, OLD.faturamento_id);
  PERFORM public.sync_faturamento_aggregate(v_faturamento_id);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 9. Triggers em itens_faturamento
DROP TRIGGER IF EXISTS trg_itens_faturamento_after_insert ON public.itens_faturamento;
CREATE TRIGGER trg_itens_faturamento_after_insert
  AFTER INSERT ON public.itens_faturamento
  FOR EACH ROW EXECUTE FUNCTION public.itens_faturamento_after_change();

DROP TRIGGER IF EXISTS trg_itens_faturamento_after_update ON public.itens_faturamento;
CREATE TRIGGER trg_itens_faturamento_after_update
  AFTER UPDATE ON public.itens_faturamento
  FOR EACH ROW EXECUTE FUNCTION public.itens_faturamento_after_change();

DROP TRIGGER IF EXISTS trg_itens_faturamento_after_delete ON public.itens_faturamento;
CREATE TRIGGER trg_itens_faturamento_after_delete
  AFTER DELETE ON public.itens_faturamento
  FOR EACH ROW EXECUTE FUNCTION public.itens_faturamento_after_change();

-- 10. set_faturamento_status_on_guia_autorizacao
CREATE OR REPLACE FUNCTION public.set_faturamento_status_on_guia_autorizacao()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF (
    (NEW.numero_autorizacao IS NOT NULL AND btrim(NEW.numero_autorizacao) <> '')
    OR (NEW.url_guia_autorizacao IS NOT NULL AND array_length(NEW.url_guia_autorizacao, 1) IS NOT NULL AND array_length(NEW.url_guia_autorizacao, 1) > 0)
  ) THEN
    NEW.status := 'ATIVO';
  ELSE
    IF NEW.status IS NULL THEN
      NEW.status := 'INATIVO';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_faturamento_status_on_guia_autorizacao ON public.faturamentos;
CREATE TRIGGER trg_set_faturamento_status_on_guia_autorizacao
  BEFORE INSERT OR UPDATE ON public.faturamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_faturamento_status_on_guia_autorizacao();

-- 11. usuarios_sistema_try_link_auth_id
CREATE OR REPLACE FUNCTION public.usuarios_sistema_try_link_auth_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_auth_id uuid;
  v_email text;
BEGIN
  v_email := public.normalize_email(NEW.email);
  IF v_email = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE public.normalize_email(email) = v_email
  LIMIT 1;

  IF v_auth_id IS NOT NULL THEN
    NEW.id_user := v_auth_id;
    NEW.email := v_email;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS usuarios_sistema_try_link_auth_id_bi ON public.usuarios_sistema;
CREATE TRIGGER usuarios_sistema_try_link_auth_id_bi
  BEFORE INSERT OR UPDATE ON public.usuarios_sistema
  FOR EACH ROW EXECUTE FUNCTION public.usuarios_sistema_try_link_auth_id();

-- 12. sync_usuarios_sistema_from_auth
CREATE OR REPLACE FUNCTION public.sync_usuarios_sistema_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_nome  text;
  v_role  text;
BEGIN
  v_email := public.normalize_email(NEW.email);
  IF v_email = '' THEN
    RETURN NEW;
  END IF;

  v_nome := COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''), v_email);

  v_role := public.normalize_email(NEW.raw_user_meta_data ->> 'role');
  IF v_role NOT IN ('admin', 'medico', 'super_admin') THEN
    v_role := 'medico';
  END IF;

  UPDATE public.usuarios_sistema
  SET id_user = NEW.id,
      email = v_email,
      nome = COALESCE(NULLIF(trim(nome), ''), v_nome),
      regra = COALESCE(NULLIF(trim(regra), ''), upper(v_role)),
      ativo = true
  WHERE public.normalize_email(email) = v_email;

  IF NOT FOUND THEN
    INSERT INTO public.usuarios_sistema (id_user, nome, email, celular, regra, ativo)
    VALUES (NEW.id, v_nome, v_email, NULL, upper(v_role), true)
    ON CONFLICT (id_user) DO UPDATE
      SET email = excluded.email,
          nome = excluded.nome,
          ativo = true;
  END IF;

  RETURN NEW;
END;
$function$;

-- 13. purge_user_everything
CREATE OR REPLACE FUNCTION public.purge_user_everything(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_user_id uuid;
  v_deleted jsonb := '{}'::jsonb;
  v_rowcount integer;
  v_cols text[];
  v_where text;
  v_sql text;
  r record;
BEGIN
  v_email := public.normalize_email(p_email);
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'email_invalido';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE public.normalize_email(email) = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  BEGIN
    EXECUTE 'UPDATE public.faturamentos SET guia_honorarios_id = NULL WHERE guia_honorarios_id IN (SELECT id FROM public.guia_honorarios WHERE medico_id = $1)'
    USING v_user_id;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('faturamentos.guia_honorarios_id.nullified', v_rowcount);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    EXECUTE 'DELETE FROM public.itens_guia_solicitacao WHERE guia_id IN (SELECT id FROM public.guia_solicitacao WHERE medico_id = $1)'
    USING v_user_id;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('itens_guia_solicitacao.by_guia', v_rowcount);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    EXECUTE 'UPDATE public.faturamentos SET guia_solicitacao_id = NULL WHERE guia_solicitacao_id IN (SELECT id FROM public.guia_solicitacao WHERE medico_id = $1)'
    USING v_user_id;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('faturamentos.guia_solicitacao_id.nullified', v_rowcount);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    EXECUTE 'DELETE FROM public.subscription_enrollments WHERE public.normalize_email(user_email) = $1'
    USING v_email;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('subscription_enrollments.user_email', v_rowcount);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    EXECUTE 'DELETE FROM public.usuarios_sistema WHERE public.normalize_email(email) = $1'
    USING v_email;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('usuarios_sistema.email', v_rowcount);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  BEGIN
    EXECUTE 'DELETE FROM public.medicos WHERE public.normalize_email(email) = $1'
    USING v_email;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('medicos.email', v_rowcount);
  EXCEPTION WHEN undefined_table THEN NULL;
  END;

  RETURN jsonb_build_object('status', 'ok', 'email', v_email, 'user_id', v_user_id, 'deleted', v_deleted);
END;
$function$;

-- 14. list_storage_objects_for_user
CREATE OR REPLACE FUNCTION public.list_storage_objects_for_user(p_user_id uuid)
RETURNS TABLE(bucket_id text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'storage', 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT o.bucket_id, o.name
  FROM storage.objects o
  WHERE o.name ILIKE '%' || p_user_id::text || '/%'
     OR o.name ILIKE '%/' || p_user_id::text || '/%'
     OR o.name ILIKE p_user_id::text || '/%';
END;
$function$;

-- 15. Trigger updated_at em faturamento_consistencia
DROP TRIGGER IF EXISTS trg_faturamento_consistencia_updated_at ON public.faturamento_consistencia;
CREATE TRIGGER trg_faturamento_consistencia_updated_at
  BEFORE UPDATE ON public.faturamento_consistencia
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
