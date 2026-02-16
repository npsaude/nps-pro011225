-- ==============================
-- Conmedic • Faturamento Médico (multi-tenant por médico logado)
-- Tabelas: public.faturamentos, public.itens_faturamento
-- RLS: médico só acessa seus próprios registros via medico_id = auth.uid()
-- Totais/status: recalculados automaticamente a partir dos itens
-- ==============================

-- --------
-- Enums
-- --------
DO $$ BEGIN
  CREATE TYPE public.faturamento_status_pagamento AS ENUM (
    'pendente',
    'pago_integral',
    'pago_parcial',
    'glosado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.item_tipo_procedimento AS ENUM (
    'principal',
    'secundario',
    'anestesia',
    'sadt'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.item_status_pagamento AS ENUM (
    'pendente',
    'pago_integral',
    'pago_parcial',
    'glosado_total',
    'glosado_parcial'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- -----------------
-- Tabela: faturamentos
-- -----------------
CREATE TABLE IF NOT EXISTS public.faturamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- multi-tenant
  medico_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identificação
  numero_guia_honorarios text,
  numero_autorizacao text,
  numero_guia_internacao text,

  -- Atendimento
  data_atendimento date,
  data_cirurgia date,
  hora_inicio time,
  hora_fim time,

  -- Hospital como texto (origem: public.clinicas.nome_fantasia)
  hospital_nome text,
  hospital_codigo_cnes text,

  -- Paciente
  paciente_nome text,
  paciente_cpf text,
  paciente_carteirinha text,
  paciente_convenio text,

  -- Diagnóstico
  diagnostico_cid text,
  diagnostico_descricao text,

  -- Equipe (principal)
  cirurgiao_principal_nome text,
  cirurgiao_principal_crm text,
  cirurgiao_principal_uf char(2),
  cirurgiao_principal_cbo text,

  -- Totais (calculados)
  valor_total_faturado numeric(10,2) NOT NULL DEFAULT 0,
  valor_total_glosa numeric(10,2) NOT NULL DEFAULT 0,
  valor_total_desconto numeric(10,2) NOT NULL DEFAULT 0,
  valor_total_liquido numeric(10,2) NOT NULL DEFAULT 0,
  valor_total_repasse numeric(10,2) NOT NULL DEFAULT 0,

  -- Pagamento
  forma_pagamento text,
  grau_participacao text,
  data_pagamento date,
  status_pagamento public.faturamento_status_pagamento NOT NULL DEFAULT 'pendente',

  -- Documentos (armazenar paths do Storage; URL assinada deve ser gerada sob demanda)
  url_guia_autorizacao text[] NOT NULL DEFAULT '{}'::text[],
  url_descricao_cirurgica text[] NOT NULL DEFAULT '{}'::text[],
  url_guia_honorarios text[] NOT NULL DEFAULT '{}'::text[],
  url_relatorio_analitico text[] NOT NULL DEFAULT '{}'::text[],

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Checks
  CONSTRAINT faturamentos_totais_nao_negativos CHECK (
    valor_total_faturado >= 0 AND
    valor_total_glosa >= 0 AND
    valor_total_desconto >= 0 AND
    valor_total_liquido >= 0 AND
    valor_total_repasse >= 0
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_faturamentos_medico ON public.faturamentos(medico_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_data ON public.faturamentos(data_atendimento);
CREATE INDEX IF NOT EXISTS idx_faturamentos_status ON public.faturamentos(status_pagamento);

-- -----------------
-- Tabela: itens_faturamento
-- -----------------
CREATE TABLE IF NOT EXISTS public.itens_faturamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faturamento_id uuid NOT NULL REFERENCES public.faturamentos(id) ON DELETE CASCADE,

  -- Procedimento
  codigo_procedimento text,
  descricao_procedimento text,
  tipo_procedimento public.item_tipo_procedimento,
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade >= 0),

  -- Profissional executor
  profissional_nome text,
  profissional_crm text,
  profissional_uf char(2),
  profissional_cbo text,
  percentual_participacao numeric(5,2) NOT NULL DEFAULT 100 CHECK (percentual_participacao BETWEEN 0 AND 100),

  -- Valores base
  valor_unitario numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor_unitario >= 0),
  valor_total_item numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor_total_item >= 0),

  -- Conciliação por item
  valor_faturado numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor_faturado >= 0),
  valor_glosa numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor_glosa >= 0),
  valor_desconto numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor_desconto >= 0),
  valor_liquido numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor_liquido >= 0),
  valor_repasse numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor_repasse >= 0),
  percentual_repasse numeric(5,2) NOT NULL DEFAULT 0 CHECK (percentual_repasse BETWEEN 0 AND 100),

  status_item public.item_status_pagamento NOT NULL DEFAULT 'pendente',
  motivo_glosa text,
  codigo_glosa text,
  data_conciliacao date,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Regras
  CONSTRAINT itens_valor_liquido_correto CHECK (valor_liquido = (valor_faturado - valor_glosa - valor_desconto))
);

CREATE INDEX IF NOT EXISTS idx_itens_faturamento ON public.itens_faturamento(faturamento_id);
CREATE INDEX IF NOT EXISTS idx_itens_codigo_procedimento ON public.itens_faturamento(codigo_procedimento);
CREATE INDEX IF NOT EXISTS idx_itens_status ON public.itens_faturamento(status_item);

-- -----------------
-- Funções: totais & status
-- -----------------

CREATE OR REPLACE FUNCTION public.recalculate_faturamento_totals(p_faturamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  INTO
    v_total_faturado,
    v_total_glosa,
    v_total_desconto,
    v_total_liquido,
    v_total_repasse
  FROM public.itens_faturamento i
  WHERE i.faturamento_id = p_faturamento_id;

  UPDATE public.faturamentos f
  SET
    valor_total_faturado = v_total_faturado,
    valor_total_glosa = v_total_glosa,
    valor_total_desconto = v_total_desconto,
    valor_total_liquido = v_total_liquido,
    valor_total_repasse = v_total_repasse,
    updated_at = now()
  WHERE f.id = p_faturamento_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_faturamento_status(p_faturamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_itens integer;
  v_pendentes integer;
  v_pago_integral integer;
  v_pago_parcial integer;
  v_glosado_total integer;
  v_glosado_parcial integer;
  v_status public.faturamento_status_pagamento;
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
      SUM(CASE WHEN i.status_item = 'pago_parcial' THEN 1 ELSE 0 END),
      SUM(CASE WHEN i.status_item = 'glosado_total' THEN 1 ELSE 0 END),
      SUM(CASE WHEN i.status_item = 'glosado_parcial' THEN 1 ELSE 0 END)
    INTO
      v_pendentes,
      v_pago_integral,
      v_pago_parcial,
      v_glosado_total,
      v_glosado_parcial
    FROM public.itens_faturamento i
    WHERE i.faturamento_id = p_faturamento_id;

    IF COALESCE(v_pendentes,0) = v_total_itens THEN
      v_status := 'pendente';
    ELSIF COALESCE(v_pago_integral,0) = v_total_itens THEN
      v_status := 'pago_integral';
    ELSIF COALESCE(v_glosado_total,0) = v_total_itens THEN
      v_status := 'glosado';
    ELSE
      -- Qualquer mistura (pago_parcial, glosado_parcial, mix de pagos/pendentes) => pago_parcial
      v_status := 'pago_parcial';
    END IF;
  END IF;

  UPDATE public.faturamentos f
  SET status_pagamento = v_status,
      updated_at = now()
  WHERE f.id = p_faturamento_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_faturamento_aggregate(p_faturamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_faturamento_totals(p_faturamento_id);
  PERFORM public.recalculate_faturamento_status(p_faturamento_id);
END;
$$;

-- Trigger helper
CREATE OR REPLACE FUNCTION public.itens_faturamento_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_faturamento_id uuid;
BEGIN
  v_faturamento_id := COALESCE(NEW.faturamento_id, OLD.faturamento_id);
  PERFORM public.sync_faturamento_aggregate(v_faturamento_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_itens_faturamento_after_insert ON public.itens_faturamento;
DROP TRIGGER IF EXISTS trg_itens_faturamento_after_update ON public.itens_faturamento;
DROP TRIGGER IF EXISTS trg_itens_faturamento_after_delete ON public.itens_faturamento;

CREATE TRIGGER trg_itens_faturamento_after_insert
AFTER INSERT ON public.itens_faturamento
FOR EACH ROW EXECUTE FUNCTION public.itens_faturamento_after_change();

CREATE TRIGGER trg_itens_faturamento_after_update
AFTER UPDATE ON public.itens_faturamento
FOR EACH ROW EXECUTE FUNCTION public.itens_faturamento_after_change();

CREATE TRIGGER trg_itens_faturamento_after_delete
AFTER DELETE ON public.itens_faturamento
FOR EACH ROW EXECUTE FUNCTION public.itens_faturamento_after_change();

-- -----------------
-- RLS
-- -----------------
ALTER TABLE public.faturamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_faturamento ENABLE ROW LEVEL SECURITY;

-- Faturamentos: médico vê apenas seus registros
DROP POLICY IF EXISTS faturamentos_select_medico ON public.faturamentos;
DROP POLICY IF EXISTS faturamentos_insert_medico ON public.faturamentos;
DROP POLICY IF EXISTS faturamentos_update_medico ON public.faturamentos;
DROP POLICY IF EXISTS faturamentos_delete_medico ON public.faturamentos;

CREATE POLICY faturamentos_select_medico
ON public.faturamentos
FOR SELECT TO authenticated
USING (medico_id = auth.uid());

CREATE POLICY faturamentos_insert_medico
ON public.faturamentos
FOR INSERT TO authenticated
WITH CHECK (medico_id = auth.uid());

CREATE POLICY faturamentos_update_medico
ON public.faturamentos
FOR UPDATE TO authenticated
USING (medico_id = auth.uid())
WITH CHECK (medico_id = auth.uid());

CREATE POLICY faturamentos_delete_medico
ON public.faturamentos
FOR DELETE TO authenticated
USING (medico_id = auth.uid());

-- Itens: só acessa se o faturamento pertencer ao médico
DROP POLICY IF EXISTS itens_faturamento_select_medico ON public.itens_faturamento;
DROP POLICY IF EXISTS itens_faturamento_insert_medico ON public.itens_faturamento;
DROP POLICY IF EXISTS itens_faturamento_update_medico ON public.itens_faturamento;
DROP POLICY IF EXISTS itens_faturamento_delete_medico ON public.itens_faturamento;

CREATE POLICY itens_faturamento_select_medico
ON public.itens_faturamento
FOR SELECT TO authenticated
USING (
  faturamento_id IN (SELECT id FROM public.faturamentos WHERE medico_id = auth.uid())
);

CREATE POLICY itens_faturamento_insert_medico
ON public.itens_faturamento
FOR INSERT TO authenticated
WITH CHECK (
  faturamento_id IN (SELECT id FROM public.faturamentos WHERE medico_id = auth.uid())
);

CREATE POLICY itens_faturamento_update_medico
ON public.itens_faturamento
FOR UPDATE TO authenticated
USING (
  faturamento_id IN (SELECT id FROM public.faturamentos WHERE medico_id = auth.uid())
)
WITH CHECK (
  faturamento_id IN (SELECT id FROM public.faturamentos WHERE medico_id = auth.uid())
);

CREATE POLICY itens_faturamento_delete_medico
ON public.itens_faturamento
FOR DELETE TO authenticated
USING (
  faturamento_id IN (SELECT id FROM public.faturamentos WHERE medico_id = auth.uid())
);
