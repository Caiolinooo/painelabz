-- Script para adicionar a coluna password_hash à tabela users_unified

-- Verificar se a coluna password_hash já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users_unified'
        AND column_name = 'password_hash'
    ) THEN
        -- Adicionar a coluna password_hash
        ALTER TABLE users_unified ADD COLUMN password_hash TEXT;
        
        -- Copiar os valores da coluna password para password_hash
        UPDATE users_unified SET password_hash = password WHERE password IS NOT NULL;
    END IF;
END $$;

-- Criar índice para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_users_unified_password_hash ON users_unified(password_hash);

-- Adicionar comentário à coluna
COMMENT ON COLUMN users_unified.password_hash IS 'Hash da senha do usuário para autenticação';
