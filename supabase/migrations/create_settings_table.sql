-- Criar função execute_sql se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'execute_sql'
  ) THEN
    CREATE OR REPLACE FUNCTION execute_sql(query text)
    RETURNS VOID AS $$
    BEGIN
      EXECUTE query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    RAISE NOTICE 'Função execute_sql criada com sucesso';
  ELSE
    RAISE NOTICE 'Função execute_sql já existe';
  END IF;
END
$$;

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

-- Verificar se a inserção foi bem-sucedida
DO $$
DECLARE
  settings_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO settings_count FROM settings WHERE key = 'reimbursement_email_settings';
  
  IF settings_count > 0 THEN
    RAISE NOTICE 'Configuração de reembolso criada com sucesso';
  ELSE
    RAISE NOTICE 'Falha ao criar configuração de reembolso';
  END IF;
END
$$;
