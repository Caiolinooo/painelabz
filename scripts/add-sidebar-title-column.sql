-- Adicionar coluna sidebarTitle na tabela SiteConfig
-- Execute este script no Supabase SQL Editor

-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'SiteConfig'
        AND column_name = 'sidebarTitle'
    ) THEN
        ALTER TABLE "SiteConfig"
        ADD COLUMN "sidebarTitle" TEXT;

        RAISE NOTICE 'Coluna sidebarTitle adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna sidebarTitle já existe';
    END IF;
END $$;

-- Verificar a estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'SiteConfig'
ORDER BY ordinal_position;
