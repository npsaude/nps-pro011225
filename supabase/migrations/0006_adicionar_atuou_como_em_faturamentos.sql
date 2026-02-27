-- Migration: adicionar campo atuou_como em public.faturamentos

ALTER TABLE public.faturamentos
ADD COLUMN IF NOT EXISTS atuou_como text;

ALTER TABLE public.faturamentos
DROP CONSTRAINT IF EXISTS faturamentos_atuou_como_check;

ALTER TABLE public.faturamentos
ADD CONSTRAINT faturamentos_atuou_como_check
CHECK (
  atuou_como IS NULL OR atuou_como IN (
    'CIRURGIAO',
    'PRIMEIRO_AUXILIAR',
    'SEGUNDO_AUXILIAR',
    'TERCEIRO_AUXILIAR',
    'ANESTESISTA'
  )
);

COMMENT ON COLUMN public.faturamentos.atuou_como IS 'Atuação do médico logado nesta cirurgia (CIRURGIAO, PRIMEIRO_AUXILIAR, SEGUNDO_AUXILIAR, TERCEIRO_AUXILIAR, ANESTESISTA)';
