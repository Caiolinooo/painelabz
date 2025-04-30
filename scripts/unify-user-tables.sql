-- Script to unify all user-related tables into a single table

-- Create the unified users table
CREATE TABLE IF NOT EXISTS users_unified (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic user information
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
  
  -- Authentication fields
  verification_code TEXT,
  verification_code_expires TIMESTAMP WITH TIME ZONE,
  password_last_changed TIMESTAMP WITH TIME ZONE,
  
  -- Invitation fields
  invite_code TEXT,
  invite_sent BOOLEAN DEFAULT FALSE,
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  invite_accepted BOOLEAN DEFAULT FALSE,
  invite_accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Authorization fields (from authorized_users)
  is_authorized BOOLEAN DEFAULT FALSE,
  authorization_status TEXT DEFAULT 'pending' CHECK (authorization_status IN ('active', 'pending', 'rejected', 'expired')),
  authorization_domain TEXT,
  authorization_expires_at TIMESTAMP WITH TIME ZONE,
  authorization_max_uses INTEGER,
  authorization_uses INTEGER DEFAULT 0,
  authorized_by UUID REFERENCES users_unified(id),
  authorization_notes JSONB,
  
  -- Permissions (from user_permissions)
  access_permissions JSONB,
  
  -- History
  access_history JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_unified_email ON users_unified(email);
CREATE INDEX IF NOT EXISTS idx_users_unified_phone ON users_unified(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_unified_role ON users_unified(role);
CREATE INDEX IF NOT EXISTS idx_users_unified_active ON users_unified(active);
CREATE INDEX IF NOT EXISTS idx_users_unified_auth_status ON users_unified(authorization_status);

-- Migrate data from the users table
INSERT INTO users_unified (
  id,
  email,
  phone_number,
  first_name,
  last_name,
  role,
  position,
  department,
  avatar,
  active,
  password_last_changed,
  created_at,
  updated_at,
  is_authorized,
  authorization_status
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
  avatar,
  active,
  password_last_changed,
  created_at,
  updated_at,
  TRUE, -- All existing users are considered authorized
  'active' -- All existing users have active authorization status
FROM users
ON CONFLICT (id) DO NOTHING;

-- Migrate data from the User table (Prisma)
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
  TRUE, -- All existing users are considered authorized
  'active' -- All existing users have active authorization status
FROM "User"
WHERE email NOT IN (SELECT email FROM users_unified WHERE email IS NOT NULL)
  AND "phoneNumber" NOT IN (SELECT phone_number FROM users_unified WHERE phone_number IS NOT NULL)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  phone_number = EXCLUDED.phone_number,
  password = EXCLUDED.password,
  verification_code = EXCLUDED.verification_code,
  verification_code_expires = EXCLUDED.verification_code_expires,
  invite_code = EXCLUDED.invite_code,
  invite_sent = EXCLUDED.invite_sent,
  invite_sent_at = EXCLUDED.invite_sent_at,
  invite_accepted = EXCLUDED.invite_accepted,
  invite_accepted_at = EXCLUDED.invite_accepted_at,
  password_last_changed = EXCLUDED.password_last_changed,
  access_permissions = EXCLUDED.access_permissions,
  access_history = EXCLUDED.access_history;

-- Migrate data from authorized_users table
-- First, create temporary users for authorized_users that don't have corresponding users
INSERT INTO users_unified (
  id,
  email,
  phone_number,
  first_name,
  last_name,
  role,
  active,
  is_authorized,
  authorization_status,
  authorization_domain,
  authorization_expires_at,
  authorization_max_uses,
  authorization_uses,
  authorized_by,
  authorization_notes,
  invite_code,
  created_at,
  updated_at
)
SELECT
  id,
  email,
  phone_number,
  'Authorized', -- Default first name
  'User', -- Default last name
  'USER', -- Default role
  FALSE, -- Not active until they register
  TRUE, -- Is authorized
  status,
  domain,
  expires_at,
  max_uses,
  uses,
  created_by,
  notes,
  invite_code,
  created_at,
  updated_at
FROM authorized_users
WHERE (email IS NOT NULL AND email NOT IN (SELECT email FROM users_unified WHERE email IS NOT NULL))
   OR (phone_number IS NOT NULL AND phone_number NOT IN (SELECT phone_number FROM users_unified WHERE phone_number IS NOT NULL))
ON CONFLICT (id) DO NOTHING;

-- Update existing users with authorization data
UPDATE users_unified u
SET
  is_authorized = TRUE,
  authorization_status = a.status,
  authorization_domain = a.domain,
  authorization_expires_at = a.expires_at,
  authorization_max_uses = a.max_uses,
  authorization_uses = a.uses,
  authorized_by = a.created_by,
  authorization_notes = a.notes,
  invite_code = COALESCE(u.invite_code, a.invite_code)
FROM authorized_users a
WHERE (u.email = a.email AND u.email IS NOT NULL AND a.email IS NOT NULL)
   OR (u.phone_number = a.phone_number AND u.phone_number IS NOT NULL AND a.phone_number IS NOT NULL);

-- Migrate user permissions
-- First, create a function to merge permissions
CREATE OR REPLACE FUNCTION merge_permissions(existing JSONB, module TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF existing IS NULL THEN
    result := jsonb_build_object('modules', jsonb_build_object(module, true));
  ELSE
    result := existing;
    IF result->'modules' IS NULL THEN
      result := jsonb_set(result, '{modules}', jsonb_build_object(module, true));
    ELSE
      result := jsonb_set(result, ARRAY['modules', module], 'true'::jsonb);
    END IF;
  END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update users with their permissions
DO $$
DECLARE
  perm RECORD;
BEGIN
  FOR perm IN SELECT user_id, module FROM user_permissions LOOP
    UPDATE users_unified
    SET access_permissions = merge_permissions(access_permissions, perm.module)
    WHERE id = perm.user_id;
  END LOOP;
END $$;

-- Drop the function after use
DROP FUNCTION merge_permissions(JSONB, TEXT);

-- Add default permissions for users without permissions
UPDATE users_unified
SET access_permissions = jsonb_build_object(
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
    'admin', (role = 'ADMIN')
  )
)
WHERE access_permissions IS NULL OR access_permissions->'modules' IS NULL;

-- Migrate access history from the access_history table
DO $$
DECLARE
  hist RECORD;
  existing_history JSONB;
  new_entry JSONB;
BEGIN
  FOR hist IN SELECT * FROM access_history LOOP
    -- Get existing history
    SELECT access_history INTO existing_history FROM users_unified WHERE id = hist.user_id;
    
    -- Create new entry
    new_entry := jsonb_build_object(
      'timestamp', hist.created_at,
      'action', hist.action,
      'details', hist.details,
      'ip_address', hist.ip_address,
      'user_agent', hist.user_agent
    );
    
    -- Update user's history
    IF existing_history IS NULL THEN
      UPDATE users_unified SET access_history = jsonb_build_array(new_entry) WHERE id = hist.user_id;
    ELSE
      UPDATE users_unified SET access_history = existing_history || new_entry WHERE id = hist.user_id;
    END IF;
  END LOOP;
END $$;

-- Create the admin user if it doesn't exist
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

-- Enable row level security
ALTER TABLE users_unified ENABLE ROW LEVEL SECURITY;

-- Create policies for the unified table
CREATE POLICY "Administrators can do anything with users."
  ON users_unified
  USING (
    (SELECT role FROM users_unified WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE POLICY "Users can view their own data."
  ON users_unified
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own data."
  ON users_unified
  FOR UPDATE
  USING (id = auth.uid());

-- Create a view for backward compatibility with the old tables
CREATE OR REPLACE VIEW users_view AS
SELECT
  id,
  email,
  phone_number,
  first_name,
  last_name,
  role,
  position,
  department,
  avatar,
  active,
  password_last_changed,
  created_at,
  updated_at
FROM users_unified;

CREATE OR REPLACE VIEW authorized_users_view AS
SELECT
  id,
  email,
  phone_number,
  authorization_domain AS domain,
  invite_code,
  authorization_status AS status,
  authorization_expires_at AS expires_at,
  authorization_max_uses AS max_uses,
  authorization_uses AS uses,
  authorized_by AS created_by,
  NULL AS updated_by,
  authorization_notes AS notes,
  created_at,
  updated_at
FROM users_unified
WHERE is_authorized = TRUE;

CREATE OR REPLACE VIEW user_permissions_view AS
SELECT
  uuid_generate_v4() AS id,
  u.id AS user_id,
  key AS module,
  NULL AS feature,
  created_at,
  updated_at
FROM users_unified u,
LATERAL jsonb_object_keys(u.access_permissions->'modules') AS key
WHERE u.access_permissions->'modules'->key = 'true'::jsonb;

-- Comment on the new table and views
COMMENT ON TABLE users_unified IS 'Unified table containing all user-related data';
COMMENT ON VIEW users_view IS 'Backward compatibility view for the users table';
COMMENT ON VIEW authorized_users_view IS 'Backward compatibility view for the authorized_users table';
COMMENT ON VIEW user_permissions_view IS 'Backward compatibility view for the user_permissions table';
