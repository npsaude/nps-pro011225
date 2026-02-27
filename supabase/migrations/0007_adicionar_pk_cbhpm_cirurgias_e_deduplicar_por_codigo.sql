-- Garantir chave única para upsert/importação por código

-- 1) Remover duplicadas por codigo (mantém a mais recente)
WITH ranked AS (
  SELECT
    codigo,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY codigo
      ORDER BY created_at DESC NULLS LAST
    ) AS rn
  FROM public.cbhpm_cirurgias
)
DELETE FROM public.cbhpm_cirurgias c
USING ranked r
WHERE c.codigo = r.codigo
  AND (c.created_at IS NOT DISTINCT FROM r.created_at)
  AND r.rn > 1;

-- 2) Tornar codigo a chave primária (necessário para UPSERT por conflito)
ALTER TABLE public.cbhpm_cirurgias
  ADD CONSTRAINT IF NOT EXISTS cbhpm_cirurgias_pkey PRIMARY KEY (codigo);
