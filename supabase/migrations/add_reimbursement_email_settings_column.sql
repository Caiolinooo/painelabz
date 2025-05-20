-- Script para adicionar a coluna reimbursement_email_settings à tabela users_unified
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna se não existir
ALTER TABLE users_unified ADD COLUMN IF NOT EXISTS reimbursement_email_settings JSONB;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_users_unified_reimbursement_email_settings ON users_unified USING GIN (reimbursement_email_settings);

-- Atualizar usuários existentes com configurações padrão
UPDATE users_unified
SET reimbursement_email_settings = '{"enabled": false, "recipients": []}'::jsonb
WHERE reimbursement_email_settings IS NULL;

-- Verificar se a coluna foi adicionada corretamente
SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'users_unified' AND 
  column_name = 'reimbursement_email_settings';
