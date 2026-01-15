-- 1) Ajusta a constraint para aceitar SUPER_ADMIN também
ALTER TABLE public.usuarios_sistema
DROP CONSTRAINT IF EXISTS usuarios_sistema_regra_check;

ALTER TABLE public.usuarios_sistema
ADD CONSTRAINT usuarios_sistema_regra_check
CHECK (lower(regra) IN ('admin', 'medico', 'super_admin'));

-- 2) Promove o usuário
UPDATE public.usuarios_sistema
SET regra = 'SUPER_ADMIN'
WHERE nome = 'Adriano Portugal';