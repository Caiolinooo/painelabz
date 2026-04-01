-- Create Poliweb credentials table
-- Stores custom Poliweb login credentials per user for auto-login integration

CREATE TABLE IF NOT EXISTS poliweb_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE poliweb_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all credentials
CREATE POLICY "Admins can manage poliweb_credentials"
  ON poliweb_credentials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_unified
      WHERE users_unified.id = auth.uid()
      AND users_unified.role = 'ADMIN'
    )
  );

-- Policy: Users can read their own credentials
CREATE POLICY "Users can read own poliweb credentials"
  ON poliweb_credentials
  FOR SELECT
  USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_poliweb_credentials_user_id ON poliweb_credentials(user_id);
