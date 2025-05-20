-- Script para criar tabelas relacionadas ao perfil do usuário

-- Tabela para e-mails adicionais
CREATE TABLE IF NOT EXISTS user_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  label TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  verification_code_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Índices para a tabela user_emails
CREATE INDEX IF NOT EXISTS idx_user_emails_user_id ON user_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_user_emails_email ON user_emails(email);

-- Tabela para números de telefone adicionais
CREATE TABLE IF NOT EXISTS user_phones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  label TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE,
  verification_code TEXT,
  verification_code_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, phone_number)
);

-- Índices para a tabela user_phones
CREATE INDEX IF NOT EXISTS idx_user_phones_user_id ON user_phones(user_id);
CREATE INDEX IF NOT EXISTS idx_user_phones_phone_number ON user_phones(phone_number);

-- Adicionar coluna para referência à foto de perfil no Google Drive
ALTER TABLE users_unified ADD COLUMN IF NOT EXISTS drive_photo_id TEXT;
ALTER TABLE users_unified ADD COLUMN IF NOT EXISTS drive_photo_url TEXT;

-- Comentários nas colunas
COMMENT ON COLUMN users_unified.drive_photo_id IS 'ID da foto de perfil no Google Drive';
COMMENT ON COLUMN users_unified.drive_photo_url IS 'URL da foto de perfil no Google Drive';

-- Políticas de segurança para a tabela user_emails
ALTER TABLE user_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios e-mails"
  ON user_emails
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem adicionar seus próprios e-mails"
  ON user_emails
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar seus próprios e-mails"
  ON user_emails
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem excluir seus próprios e-mails"
  ON user_emails
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Administradores podem gerenciar todos os e-mails"
  ON user_emails
  USING ((SELECT role FROM users_unified WHERE id = auth.uid()) = 'ADMIN');

-- Políticas de segurança para a tabela user_phones
ALTER TABLE user_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios telefones"
  ON user_phones
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem adicionar seus próprios telefones"
  ON user_phones
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar seus próprios telefones"
  ON user_phones
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem excluir seus próprios telefones"
  ON user_phones
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Administradores podem gerenciar todos os telefones"
  ON user_phones
  USING ((SELECT role FROM users_unified WHERE id = auth.uid()) = 'ADMIN');
