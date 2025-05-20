-- Criar tabela settings se não existir
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
