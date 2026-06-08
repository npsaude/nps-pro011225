-- 0015 — Purga de usuário: incluir assinatura/Asaas
--
-- O purge_user_everything já remove (de forma genérica) toda tabela com
-- user_id/medico_id/id_user/created_by ou FK para auth.users, e as tabelas
-- por e-mail (subscription_enrollments, usuarios_sistema, medicos).
--
-- Faltava a tabela asaas_webhook_events, que NÃO tem coluna do usuário: ela se
-- liga à pessoa apenas pela assinatura (enrollment_id / customer_id /
-- subscription_id). Como o FK asaas_webhook_events.enrollment_id é
-- ON DELETE SET NULL, os eventos ficariam órfãos ao apagar as assinaturas.
-- Aqui capturamos as referências Asaas do usuário e removemos os eventos ANTES
-- de qualquer remoção de subscription_enrollments.

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
  v_enroll_ids uuid[];
  v_customer_ids text[];
  v_subscription_ids text[];
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

  -- Assinatura/Asaas: captura as referências do usuário e remove os eventos de
  -- webhook vinculados às suas assinaturas. Precisa rodar ANTES de remover as
  -- assinaturas (FK asaas_webhook_events.enrollment_id é ON DELETE SET NULL).
  BEGIN
    SELECT
      array_agg(id),
      array_remove(array_agg(asaas_customer_id), NULL),
      array_remove(array_agg(asaas_subscription_id), NULL)
    INTO v_enroll_ids, v_customer_ids, v_subscription_ids
    FROM public.subscription_enrollments
    WHERE public.normalize_email(user_email) = v_email
       OR created_by = v_user_id;

    BEGIN
      EXECUTE '
        DELETE FROM public.asaas_webhook_events
        WHERE ($1 IS NOT NULL AND array_length($1, 1) > 0 AND enrollment_id = ANY($1))
           OR ($2 IS NOT NULL AND array_length($2, 1) > 0 AND customer_id = ANY($2))
           OR ($3 IS NOT NULL AND array_length($3, 1) > 0 AND subscription_id = ANY($3))'
      USING v_enroll_ids, v_customer_ids, v_subscription_ids;
      GET DIAGNOSTICS v_rowcount = ROW_COUNT;
      v_deleted := v_deleted || jsonb_build_object('asaas_webhook_events.by_subscription', v_rowcount);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Pré-limpeza de FKs que podem apontar para conteúdo do usuário mesmo em registros de terceiros
  -- (evita violações como faturamentos -> guia_honorarios)
  BEGIN
    EXECUTE 'UPDATE public.faturamentos SET guia_honorarios_id = NULL WHERE guia_honorarios_id IN (SELECT id FROM public.guia_honorarios WHERE medico_id = $1)'
    USING v_user_id;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('faturamentos.guia_honorarios_id.nullified', v_rowcount);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    EXECUTE 'DELETE FROM public.itens_guia_solicitacao WHERE guia_id IN (SELECT id FROM public.guia_solicitacao WHERE medico_id = $1)'
    USING v_user_id;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('itens_guia_solicitacao.by_guia', v_rowcount);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    EXECUTE 'UPDATE public.faturamentos SET guia_solicitacao_id = NULL WHERE guia_solicitacao_id IN (SELECT id FROM public.guia_solicitacao WHERE medico_id = $1)'
    USING v_user_id;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('faturamentos.guia_solicitacao_id.nullified', v_rowcount);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Alvos: tabelas públicas com FK para auth.users e/ou colunas uuid comuns
  CREATE TEMP TABLE tmp_purge_targets (
    schema_name text NOT NULL,
    table_name  text NOT NULL,
    cols        text[] NOT NULL,
    PRIMARY KEY (schema_name, table_name)
  ) ON COMMIT DROP;

  INSERT INTO tmp_purge_targets(schema_name, table_name, cols)
  SELECT
    'public' AS schema_name,
    c.relname AS table_name,
    array_agg(DISTINCT a.attname) AS cols
  FROM pg_constraint fk
  JOIN pg_class c ON c.oid = fk.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = fk.conrelid AND a.attnum = ANY (fk.conkey)
  WHERE fk.contype = 'f'
    AND fk.confrelid = 'auth.users'::regclass
    AND n.nspname = 'public'
  GROUP BY c.relname;

  -- acrescenta/mescla colunas uuid comuns (mesmo sem FK)
  INSERT INTO tmp_purge_targets(schema_name, table_name, cols)
  SELECT
    table_schema,
    table_name,
    array_agg(DISTINCT column_name)
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND udt_name = 'uuid'
    AND column_name IN ('user_id', 'medico_id', 'id_user', 'created_by')
  GROUP BY table_schema, table_name
  ON CONFLICT (schema_name, table_name)
  DO UPDATE SET cols = (SELECT array_agg(DISTINCT x)
                        FROM unnest(tmp_purge_targets.cols || EXCLUDED.cols) AS x);

  -- Grafo de dependências entre tabelas (B -> A se B tem FK para A)
  CREATE TEMP TABLE tmp_purge_edges (
    from_table text NOT NULL,
    to_table   text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_purge_edges(from_table, to_table)
  SELECT
    cf.relname AS from_table,
    ct.relname AS to_table
  FROM pg_constraint fk
  JOIN pg_class cf ON cf.oid = fk.conrelid
  JOIN pg_namespace nf ON nf.oid = cf.relnamespace
  JOIN pg_class ct ON ct.oid = fk.confrelid
  JOIN pg_namespace nt ON nt.oid = ct.relnamespace
  JOIN tmp_purge_targets tf ON tf.table_name = cf.relname AND tf.schema_name = nf.nspname
  JOIN tmp_purge_targets tt ON tt.table_name = ct.relname AND tt.schema_name = nt.nspname
  WHERE fk.contype = 'f'
    AND nf.nspname = 'public'
    AND nt.nspname = 'public';

  -- Deleta em ordem topológica (por tabelas), removendo linhas por colunas ligadas ao usuário
  WHILE EXISTS (SELECT 1 FROM tmp_purge_targets) LOOP
    SELECT t.schema_name, t.table_name, t.cols
    INTO r
    FROM tmp_purge_targets t
    WHERE NOT EXISTS (
      SELECT 1
      FROM tmp_purge_edges e
      JOIN tmp_purge_targets pending
        ON pending.table_name = e.from_table AND pending.schema_name = 'public'
      WHERE e.to_table = t.table_name
    )
    LIMIT 1;

    IF r.table_name IS NULL THEN
      SELECT schema_name, table_name, cols INTO r FROM tmp_purge_targets LIMIT 1;
    END IF;

    v_cols := r.cols;
    v_where := (
      SELECT string_agg(format('%I = $1', c), ' OR ')
      FROM unnest(v_cols) AS c
    );

    IF v_where IS NULL OR v_where = '' THEN
      v_where := 'false';
    END IF;

    v_sql := format('DELETE FROM %I.%I WHERE %s', r.schema_name, r.table_name, v_where);
    EXECUTE v_sql USING v_user_id;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;

    v_deleted := v_deleted || jsonb_build_object(r.table_name, v_rowcount);

    DELETE FROM tmp_purge_edges
    WHERE from_table = r.table_name OR to_table = r.table_name;

    DELETE FROM tmp_purge_targets
    WHERE schema_name = r.schema_name AND table_name = r.table_name;
  END LOOP;

  -- Tabelas com vínculo por e-mail (texto)
  BEGIN
    EXECUTE 'DELETE FROM public.subscription_enrollments WHERE public.normalize_email(user_email) = $1'
    USING v_email;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('subscription_enrollments.user_email', v_rowcount);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    EXECUTE 'DELETE FROM public.usuarios_sistema WHERE public.normalize_email(email) = $1'
    USING v_email;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('usuarios_sistema.email', v_rowcount);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  BEGIN
    EXECUTE 'DELETE FROM public.medicos WHERE public.normalize_email(email) = $1'
    USING v_email;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_deleted := v_deleted || jsonb_build_object('medicos.email', v_rowcount);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'status', 'ok',
    'email', v_email,
    'user_id', v_user_id,
    'deleted', v_deleted
  );
END;
$function$;
