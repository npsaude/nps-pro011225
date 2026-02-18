-- Migration: Adicionar campos de status de email na tabela faturamentos
-- Data: 2024
-- Descrição: Adiciona campos para rastrear o envio de emails de faturamento

-- Adicionar campos de status de email na tabela faturamentos
ALTER TABLE public.faturamentos 
ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'NAO_ENVIADO',
ADD COLUMN IF NOT EXISTS email_enviado_em TIMESTAMP WITH TIME ZONE;

-- Adicionar constraint para validar os valores do status
ALTER TABLE public.faturamentos 
DROP CONSTRAINT IF EXISTS faturamentos_email_status_check;

ALTER TABLE public.faturamentos 
ADD CONSTRAINT faturamentos_email_status_check 
CHECK (email_status IN ('NAO_ENVIADO', 'ENVIADO'));

-- Comentários para documentação
COMMENT ON COLUMN public.faturamentos.email_status IS 'Status do envio de email: NAO_ENVIADO ou ENVIADO';
COMMENT ON COLUMN public.faturamentos.email_enviado_em IS 'Data e hora do envio do email de faturamento';
