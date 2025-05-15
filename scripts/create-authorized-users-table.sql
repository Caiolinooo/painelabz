-- Script para criar a tabela authorized_users no Supabase

-- Criar a tabela authorized_users
CREATE TABLE IF NOT EXISTS authorized_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  domain TEXT,
  invite_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  updated_by UUID,
  notes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Criar índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON authorized_users(email);
CREATE INDEX IF NOT EXISTS idx_authorized_users_phone ON authorized_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_authorized_users_domain ON authorized_users(domain);
CREATE INDEX IF NOT EXISTS idx_authorized_users_invite_code ON authorized_users(invite_code);
CREATE INDEX IF NOT EXISTS idx_authorized_users_status ON authorized_users(status);

-- Criar trigger para atualizar o campo updated_at automaticamente
CREATE TRIGGER update_authorized_users_updated_at
BEFORE UPDATE ON authorized_users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Habilitar Row Level Security
ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY authorized_users_select_policy ON authorized_users
FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY authorized_users_insert_policy ON authorized_users
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY authorized_users_update_policy ON authorized_users
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY authorized_users_delete_policy ON authorized_users
FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
);
