-- Script para criar a tabela app_secrets para armazenar credenciais e chaves de API

-- Verificar se a tabela app_secrets já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'app_secrets'
    ) THEN
        -- Criar a tabela app_secrets
        CREATE TABLE app_secrets (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            key TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL,
            description TEXT,
            is_encrypted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Adicionar índice para melhorar a performance
        CREATE INDEX idx_app_secrets_key ON app_secrets(key);
        
        -- Adicionar comentário à tabela
        COMMENT ON TABLE app_secrets IS 'Tabela para armazenar credenciais e chaves de API de forma segura';
    END IF;
END $$;

-- Configurar Row Level Security (RLS) para a tabela app_secrets
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir apenas acesso de serviço
CREATE POLICY "Apenas acesso de serviço"
    ON app_secrets
    USING (auth.role() = 'service_role');

-- Criar função para obter um segredo por chave
CREATE OR REPLACE FUNCTION get_app_secret(secret_key TEXT)
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
    secret_value TEXT;
BEGIN
    SELECT value INTO secret_value
    FROM app_secrets
    WHERE key = secret_key;
    
    RETURN secret_value;
END;
$$ LANGUAGE plpgsql;

-- Criar função para definir um segredo
CREATE OR REPLACE FUNCTION set_app_secret(secret_key TEXT, secret_value TEXT, secret_description TEXT DEFAULT NULL)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO app_secrets (key, value, description, updated_at)
    VALUES (secret_key, secret_value, secret_description, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET 
        value = EXCLUDED.value,
        description = EXCLUDED.description,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
