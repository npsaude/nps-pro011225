-- ==============================================
-- Tabela de planos de assinatura (super admin)
-- ==============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'BRL',
  billing_interval text NOT NULL CHECK (
    billing_interval IN ('DAY', 'WEEK', 'MONTH', 'YEAR')
  ),
  interval_count integer NOT NULL DEFAULT 1,
  external_plan_id text,
  setup_fee_cents integer NOT NULL DEFAULT 0 CHECK (setup_fee_cents >= 0),
  trial_days integer NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  metadata jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin can select subscription plans" ON subscription_plans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios_sistema u
      WHERE u.id_user = auth.uid()
        AND u.regra = 'SUPER_ADMIN'
        AND u.ativo = true
    )
  );

CREATE POLICY "super admin can insert subscription plans" ON subscription_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuarios_sistema u
      WHERE u.id_user = auth.uid()
        AND u.regra = 'SUPER_ADMIN'
        AND u.ativo = true
    )
  );

CREATE POLICY "super admin can update subscription plans" ON subscription_plans
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios_sistema u
      WHERE u.id_user = auth.uid()
        AND u.regra = 'SUPER_ADMIN'
        AND u.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuarios_sistema u
      WHERE u.id_user = auth.uid()
        AND u.regra = 'SUPER_ADMIN'
        AND u.ativo = true
    )
  );

CREATE POLICY "super admin can delete subscription plans" ON subscription_plans
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios_sistema u
      WHERE u.id_user = auth.uid()
        AND u.regra = 'SUPER_ADMIN'
        AND u.ativo = true
    )
  );

-- ==============================================
-- Tabela de inscrições de assinaturas (super admin)
-- ==============================================
CREATE TABLE IF NOT EXISTS subscription_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  asaas_subscription_id text,
  asaas_customer_id text,
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

ALTER TABLE subscription_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admin can select enrollments" ON subscription_enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios_sistema u
      WHERE u.id_user = auth.uid()
        AND u.regra = 'SUPER_ADMIN'
        AND u.ativo = true
    )
  );

CREATE POLICY "super admin can insert enrollments" ON subscription_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuarios_sistema u
      WHERE u.id_user = auth.uid()
        AND u.regra = 'SUPER_ADMIN'
        AND u.ativo = true
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "super admin can update enrollments" ON subscription_enrollments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios_sistema u
      WHERE u.id_user = auth.uid()
        AND u.regra = 'SUPER_ADMIN'
        AND u.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM usuarios_sistema u
      WHERE u.id_user = auth.uid()
        AND u.regra = 'SUPER_ADMIN'
        AND u.ativo = true
    )
  );

CREATE POLICY "super admin can delete enrollments" ON subscription_enrollments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM usuarios_sistema u
      WHERE u.id_user = auth.uid()
        AND u.regra = 'SUPER_ADMIN'
        AND u.ativo = true
    )
  );