-- ============================================================
-- Setup: Storage Bucket for Contratos/Assinaturas
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Criar o bucket (privado - apenas service_role acessa)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documentos-trabalhistas',
    'documentos-trabalhistas',
    false,
    26214400, -- 25MB
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO
    UPDATE SET file_size_limit = 26214400,
               allowed_mime_types = ARRAY['application/pdf'];

-- 2. Política: Service Role acesso total (backend)
CREATE POLICY "Service Role Full Access"
ON storage.objects
FOR ALL
USING (bucket_id = 'documentos-trabalhistas' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'documentos-trabalhistas' AND auth.role() = 'service_role');

-- 3. Política: Usuários autenticados podem ler documentos assinados (via signed URL)
CREATE POLICY "Authenticated Read Signed"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'documentos-trabalhistas'
    AND (storage.foldername(name))[1] = 'assinados'
    AND auth.role() = 'authenticated'
);

-- 4. Verificar se o bucket foi criado
SELECT id, name, public
FROM storage.buckets
WHERE id = 'documentos-trabalhistas';