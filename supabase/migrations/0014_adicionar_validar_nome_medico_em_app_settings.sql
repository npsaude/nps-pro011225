-- Migration: adicionar campo validar_nome_medico em public.app_settings
-- Controla se o sistema valida o nome/CRM do médico que está adicionando
-- guias (SADT, solicitação, autorização) e descrição cirúrgica.
-- Quando false, a validação de "dono da guia" é ignorada.

ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS validar_nome_medico boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.app_settings.validar_nome_medico IS 'Quando false, o sistema não valida quem está adicionando guias/descrições (não bloqueia por divergência de nome/CRM do médico).';
