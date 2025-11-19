-- Script para adicionar SUPABASE_SERVICE_KEY na tabela app_secrets
-- Execute este script no SQL Editor do Supabase Dashboard

-- Primeiro, verificar se a tabela app_secrets existe
CREATE TABLE IF NOT EXISTS app_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir a service key (ou atualizar se já existir)
INSERT INTO app_secrets (key, value, description)
VALUES (
  'SUPABASE_SERVICE_KEY',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk',
  'Supabase Service Role Key para operações administrativas'
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verificar se foi inserido
SELECT key, description, created_at, updated_at
FROM app_secrets
WHERE key = 'SUPABASE_SERVICE_KEY';
