-- ==============================
-- Conmedic • Storage Policies
-- Bucket: buckets.nps-pro (privado)
-- Estrutura de pastas:
--   {tipo_documento}/{medico_id}/{faturamento_id}/...
--   relatorio_analitico/{medico_id}/{YYYY_MM}/...
--
-- Observação:
-- Em alguns projetos, alterações em storage.objects exigem permissões de owner.
-- Se esta migration falhar por permissão, aplique via Supabase Dashboard (Storage > Policies)
-- ou execute como role com privilégios de owner.
-- ==============================

-- 1) Bucket (id/name)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'buckets.nps-pro',
  'buckets.nps-pro',
  false,
  10485760,
  ARRAY['application/pdf','image/jpeg','image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Policies para storage.objects
-- (tipo_documento)/(medico_id)/...

DROP POLICY IF EXISTS "medicos_select_own_buckets_nps_pro" ON storage.objects;
DROP POLICY IF EXISTS "medicos_insert_own_buckets_nps_pro" ON storage.objects;
DROP POLICY IF EXISTS "medicos_update_own_buckets_nps_pro" ON storage.objects;
DROP POLICY IF EXISTS "medicos_delete_own_buckets_nps_pro" ON storage.objects;

CREATE POLICY "medicos_select_own_buckets_nps_pro"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'buckets.nps-pro'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "medicos_insert_own_buckets_nps_pro"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'buckets.nps-pro'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "medicos_update_own_buckets_nps_pro"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'buckets.nps-pro'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'buckets.nps-pro'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "medicos_delete_own_buckets_nps_pro"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'buckets.nps-pro'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
