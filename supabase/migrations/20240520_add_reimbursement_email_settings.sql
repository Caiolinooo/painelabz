-- Adicionar coluna reimbursement_email_settings à tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS reimbursement_email_settings JSONB;

-- Criar índice para melhorar a performance de consultas que usam essa coluna
CREATE INDEX IF NOT EXISTS idx_users_reimbursement_email_settings ON users USING GIN (reimbursement_email_settings);

-- Adicionar configuração padrão de email de reembolso
INSERT INTO settings (
  key,
  value,
  description
) VALUES (
  'reimbursement_email_settings',
  '{"enableDomainRule": true, "recipients": ["andresa.oliveira@groupabz.com", "fiscal@groupabz.com"]}',
  'Configurações de email para solicitações de reembolso'
) ON CONFLICT (key) DO NOTHING;
