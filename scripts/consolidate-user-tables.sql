-- Script para consolidar as tabelas de usuários e autenticação no Supabase

-- 1. Criar uma tabela temporária para armazenar os dados consolidados
CREATE TABLE IF NOT EXISTS users_consolidated (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'MANAGER')),
  position TEXT,
  department TEXT,
  avatar TEXT,
  verification_code TEXT,
  verification_code_expires TIMESTAMP WITH TIME ZONE,
  invite_code TEXT,
  invite_sent BOOLEAN DEFAULT FALSE,
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  invite_accepted BOOLEAN DEFAULT FALSE,
  invite_accepted_at TIMESTAMP WITH TIME ZONE,
  password_last_changed TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT TRUE,
  access_permissions JSONB,
  access_history JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Migrar dados da tabela User para a tabela consolidada
INSERT INTO users_consolidated (
  id,
  email,
  phone_number,
  first_name,
  last_name,
  password,
  role,
  position,
  department,
  avatar,
  verification_code,
  verification_code_expires,
  invite_code,
  invite_sent,
  invite_sent_at,
  invite_accepted,
  invite_accepted_at,
  password_last_changed,
  active,
  access_permissions,
  access_history,
  created_at,
  updated_at
)
SELECT
  id::UUID,
  email,
  "phoneNumber" AS phone_number,
  "firstName" AS first_name,
  "lastName" AS last_name,
  password,
  role,
  position,
  department,
  avatar,
  "verificationCode" AS verification_code,
  "verificationCodeExpires" AS verification_code_expires,
  "inviteCode" AS invite_code,
  "inviteSent" AS invite_sent,
  "inviteSentAt" AS invite_sent_at,
  "inviteAccepted" AS invite_accepted,
  "inviteAcceptedAt" AS invite_accepted_at,
  "passwordLastChanged" AS password_last_changed,
  active,
  "accessPermissions" AS access_permissions,
  "accessHistory" AS access_history,
  "createdAt" AS created_at,
  "updatedAt" AS updated_at
FROM "User"
WHERE email NOT IN (SELECT email FROM users_consolidated WHERE email IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. Migrar dados da tabela users para a tabela consolidada
INSERT INTO users_consolidated (
  id,
  email,
  phone_number,
  first_name,
  last_name,
  role,
  position,
  department,
  active,
  verification_code,
  verification_code_expires,
  password_last_changed,
  access_permissions,
  created_at,
  updated_at
)
SELECT
  id,
  email,
  phone_number,
  first_name,
  last_name,
  role,
  position,
  department,
  active,
  verification_code,
  verification_code_expires,
  password_last_changed,
  access_permissions,
  created_at,
  updated_at
FROM users
WHERE email NOT IN (SELECT email FROM users_consolidated WHERE email IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- 4. Migrar dados da tabela AuthorizedUser para a tabela consolidada
-- Apenas para usuários que não existem na tabela consolidada
INSERT INTO users_consolidated (
  email,
  phone_number,
  first_name,
  last_name,
  role,
  active,
  invite_code
)
SELECT
  email,
  "phoneNumber" AS phone_number,
  "firstName" AS first_name,
  "lastName" AS last_name,
  'USER' AS role,
  active,
  "inviteCode" AS invite_code
FROM "AuthorizedUser"
WHERE email IS NOT NULL AND email NOT IN (SELECT email FROM users_consolidated WHERE email IS NOT NULL)
ON CONFLICT (email) DO NOTHING;

-- 5. Criar uma tabela de permissões consolidada
CREATE TABLE IF NOT EXISTS user_permissions_consolidated (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_consolidated(id),
  module TEXT NOT NULL,
  feature TEXT,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, module, feature)
);

-- 6. Migrar dados da tabela user_permissions para a tabela consolidada
INSERT INTO user_permissions_consolidated (
  id,
  user_id,
  module,
  feature,
  can_view,
  can_create,
  can_edit,
  can_delete,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  module,
  feature,
  TRUE AS can_view,
  FALSE AS can_create,
  FALSE AS can_edit,
  FALSE AS can_delete,
  created_at,
  updated_at
FROM user_permissions
ON CONFLICT (user_id, module, feature) DO NOTHING;

-- 7. Criar uma tabela de histórico de acesso consolidada
CREATE TABLE IF NOT EXISTS access_history_consolidated (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_consolidated(id),
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Renomear as tabelas antigas para backup
ALTER TABLE IF EXISTS "User" RENAME TO "User_backup";
ALTER TABLE IF EXISTS users RENAME TO users_backup;
ALTER TABLE IF EXISTS "AuthorizedUser" RENAME TO "AuthorizedUser_backup";
ALTER TABLE IF EXISTS user_permissions RENAME TO user_permissions_backup;
ALTER TABLE IF EXISTS access_history RENAME TO access_history_backup;

-- 9. Renomear as tabelas consolidadas para os nomes finais
ALTER TABLE users_consolidated RENAME TO users;
ALTER TABLE user_permissions_consolidated RENAME TO user_permissions;
ALTER TABLE access_history_consolidated RENAME TO access_history;

-- 10. Criar índices para melhorar o desempenho
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);
CREATE INDEX IF NOT EXISTS idx_access_history_user_id ON access_history(user_id);
CREATE INDEX IF NOT EXISTS idx_access_history_created_at ON access_history(created_at);

-- 11. Criar funções e triggers para manter a tabela de usuários atualizada
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_user_permissions_updated_at
BEFORE UPDATE ON user_permissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
