-- Helper para checar super_admin (case-insensitive) em public.usuarios_sistema
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios_sistema u
    WHERE u.id_user = p_user_id
      AND u.ativo = true
      AND lower(u.regra) = 'super_admin'
  );
$$;

-- =========================
-- Planos de assinatura
-- =========================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'BRL',
  billing_interval text NOT NULL CHECK (billing_interval IN ('DAY', 'WEEK', 'MONTH', 'YEAR')),
  interval_count integer NOT NULL DEFAULT 1 CHECK (interval_count >= 1),
  external_plan_id text, -- ID do plano/produto no Asaas (se aplicável)
  setup_fee_cents integer NOT NULL DEFAULT 0 CHECK (setup_fee_cents >= 0),
  trial_days integer NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  metadata jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_select_super_admin" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_insert_super_admin" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_update_super_admin" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_delete_super_admin" ON public.subscription_plans;

CREATE POLICY "subscription_plans_select_super_admin"
ON public.subscription_plans
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "subscription_plans_insert_super_admin"
ON public.subscription_plans
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "subscription_plans_update_super_admin"
ON public.subscription_plans
FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "subscription_plans_delete_super_admin"
ON public.subscription_plans
FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- =========================
-- Inscrições de assinatura
-- =========================
CREATE TABLE IF NOT EXISTS public.subscription_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,

  -- Referências Asaas
  asaas_subscription_id text,
  asaas_customer_id text,

  -- Dados mínimos vindos do formulário do site (sem armazenar dados sensíveis como cartão)
  user_name text NOT NULL,
  user_email text NOT NULL,
  user_phone text,

  status text NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'TRIAL', 'ACTIVE', 'PAUSED', 'CANCELED', 'FAILED')
  ),
  payment_method text,

  current_period_start timestamptz,
  current_period_end timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  last_payment_at timestamptz,

  metadata jsonb,

  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_enrollments_select_super_admin" ON public.subscription_enrollments;
DROP POLICY IF EXISTS "subscription_enrollments_insert_super_admin" ON public.subscription_enrollments;
DROP POLICY IF EXISTS "subscription_enrollments_update_super_admin" ON public.subscription_enrollments;
DROP POLICY IF EXISTS "subscription_enrollments_delete_super_admin" ON public.subscription_enrollments;

CREATE POLICY "subscription_enrollments_select_super_admin"
ON public.subscription_enrollments
FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "subscription_enrollments_insert_super_admin"
ON public.subscription_enrollments
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "subscription_enrollments_update_super_admin"
ON public.subscription_enrollments
FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "subscription_enrollments_delete_super_admin"
ON public.subscription_enrollments
FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Índices úteis
CREATE INDEX IF NOT EXISTS subscription_enrollments_plan_id_idx ON public.subscription_enrollments(plan_id);
CREATE INDEX IF NOT EXISTS subscription_enrollments_status_idx ON public.subscription_enrollments(status);