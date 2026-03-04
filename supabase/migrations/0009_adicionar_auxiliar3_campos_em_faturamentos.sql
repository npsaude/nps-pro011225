-- Adiciona campos do 3º auxiliar no faturamento
ALTER TABLE public.faturamentos
ADD COLUMN IF NOT EXISTS auxiliar3_nome text,
ADD COLUMN IF NOT EXISTS auxiliar3_crm text;