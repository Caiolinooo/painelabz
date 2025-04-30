-- Script para criar a tabela users_unified e migrar dados

-- Criar a tabela users_unified
CREATE TABLE IF NOT EXISTS users_unified (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Informações básicas do usuário
  email TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'MANAGER')),
  position TEXT,
  department TEXT,
  avatar TEXT,
  active BOOLEAN DEFAULT TRUE,

  -- Campos de autenticação
  verification_code TEXT,
  verification_code_expires TIMESTAMP WITH TIME ZONE,
  password_last_changed TIMESTAMP WITH TIME ZONE,

  -- Campos de convite
  invite_code TEXT,
  invite_sent BOOLEAN DEFAULT FALSE,
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  invite_accepted BOOLEAN DEFAULT FALSE,
  invite_accepted_at TIMESTAMP WITH TIME ZONE,

  -- Campos de autorização
  is_authorized BOOLEAN DEFAULT FALSE,
  authorization_status TEXT DEFAULT 'pending' CHECK (authorization_status IN ('active', 'pending', 'rejected', 'expired')),
  authorization_domain TEXT,
  authorization_expires_at TIMESTAMP WITH TIME ZONE,
  authorization_max_uses INTEGER,
  authorization_uses INTEGER DEFAULT 0,
  authorized_by UUID,
  authorization_notes JSONB,

  -- Permissões
  access_permissions JSONB,

  -- Histórico
  access_history JSONB,

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar o desempenho
CREATE INDEX IF NOT EXISTS idx_users_unified_email ON users_unified(email);
CREATE INDEX IF NOT EXISTS idx_users_unified_phone ON users_unified(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_unified_role ON users_unified(role);
CREATE INDEX IF NOT EXISTS idx_users_unified_active ON users_unified(active);

-- Migrar dados da tabela users
INSERT INTO users_unified (
  id,
  email,
  phone_number,
  first_name,
  last_name,
  role,
  position,
  department,
  active,
  password_last_changed,
  created_at,
  updated_at,
  is_authorized,
  authorization_status,
  access_permissions
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
  password_last_changed,
  created_at,
  updated_at,
  TRUE, -- Todos os usuários existentes são considerados autorizados
  'active', -- Todos os usuários existentes têm status de autorização ativo
  access_permissions
FROM users
ON CONFLICT (id) DO NOTHING;

-- Migrar dados da tabela User (Prisma)
INSERT INTO users_unified (
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
  active,
  verification_code,
  verification_code_expires,
  invite_code,
  invite_sent,
  invite_sent_at,
  invite_accepted,
  invite_accepted_at,
  password_last_changed,
  access_permissions,
  access_history,
  created_at,
  updated_at,
  is_authorized,
  authorization_status
)
SELECT
  id::UUID,
  email,
  "phoneNumber",
  "firstName",
  "lastName",
  password,
  role,
  position,
  department,
  avatar,
  active,
  "verificationCode",
  "verificationCodeExpires",
  "inviteCode",
  "inviteSent",
  "inviteSentAt",
  "inviteAccepted",
  "inviteAcceptedAt",
  "passwordLastChanged",
  "accessPermissions",
  "accessHistory",
  "createdAt",
  "updatedAt",
  TRUE, -- Todos os usuários existentes são considerados autorizados
  'active' -- Todos os usuários existentes têm status de autorização ativo
FROM "User"
WHERE email IS NOT NULL AND email NOT IN (SELECT email FROM users_unified WHERE email IS NOT NULL)
   OR "phoneNumber" IS NOT NULL AND "phoneNumber" NOT IN (SELECT phone_number FROM users_unified WHERE phone_number IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- Criar o usuário administrador se não existir
INSERT INTO users_unified (
  id,
  email,
  phone_number,
  first_name,
  last_name,
  role,
  position,
  department,
  active,
  is_authorized,
  authorization_status,
  access_permissions,
  created_at,
  updated_at
)
VALUES (
  'c9b1e9a2-3c80-4b3d-9f75-fc7a00d7cdbb',
  'caio.correia@groupabz.com',
  '+5522997847289',
  'Caio',
  'Correia',
  'ADMIN',
  'Administrador do Sistema',
  'TI',
  TRUE,
  TRUE,
  'active',
  jsonb_build_object(
    'modules', jsonb_build_object(
      'dashboard', true,
      'manual', true,
      'procedimentos', true,
      'politicas', true,
      'calendario', true,
      'noticias', true,
      'reembolso', true,
      'contracheque', true,
      'ponto', true,
      'admin', true
    )
  ),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  role = 'ADMIN',
  active = TRUE,
  is_authorized = TRUE,
  authorization_status = 'active',
  access_permissions = jsonb_build_object(
    'modules', jsonb_build_object(
      'dashboard', true,
      'manual', true,
      'procedimentos', true,
      'politicas', true,
      'calendario', true,
      'noticias', true,
      'reembolso', true,
      'contracheque', true,
      'ponto', true,
      'admin', true
    )
  );
