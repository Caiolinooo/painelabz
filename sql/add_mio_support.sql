-- Adiciona suporte à integração com MIO na tabela users_unified
-- Autor: Integração MIO (Plan)
-- Data: 2026-01-05

DO $$
BEGIN
    -- Adicionar mio_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users_unified' AND column_name = 'mio_id') THEN
        ALTER TABLE users_unified ADD COLUMN mio_id TEXT;
        CREATE INDEX idx_users_unified_mio_id ON users_unified(mio_id);
    END IF;

    -- Adicionar mio_matricula
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users_unified' AND column_name = 'mio_matricula') THEN
        ALTER TABLE users_unified ADD COLUMN mio_matricula TEXT;
    END IF;

    -- Adicionar mio_last_sync
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users_unified' AND column_name = 'mio_last_sync') THEN
        ALTER TABLE users_unified ADD COLUMN mio_last_sync TIMESTAMPTZ;
    END IF;

    -- Adicionar mio_data (JSONB para flexibilidade futura e armazenar raw data)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users_unified' AND column_name = 'mio_data') THEN
        ALTER TABLE users_unified ADD COLUMN mio_data JSONB DEFAULT '{}'::jsonb;
    END IF;

END $$;
