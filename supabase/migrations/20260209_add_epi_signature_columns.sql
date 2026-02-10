-- Adicionar colunas de assinatura e entrega
ALTER TABLE epi_registrations
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Criar bucket de armazenamento para assinaturas se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('epi_signatures', 'epi_signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de armazenamento para assinaturas (simples/permissivas para evitar bloqueios, refinar depois se necessário)
CREATE POLICY "EPI Signatures Public Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'epi_signatures' );

CREATE POLICY "EPI Signatures Authenticated Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'epi_signatures' AND auth.role() = 'authenticated' );
