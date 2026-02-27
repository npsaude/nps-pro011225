-- Adicionar campo tipo_cirurgia na tabela faturamentos
-- Valores possíveis: 'ELETIVA' ou 'EMERGENCIAL'

ALTER TABLE public.faturamentos 
ADD COLUMN IF NOT EXISTS tipo_cirurgia text;

COMMENT ON COLUMN public.faturamentos.tipo_cirurgia IS 'Tipo de cirurgia: ELETIVA ou EMERGENCIAL';
