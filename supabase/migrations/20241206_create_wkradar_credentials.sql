-- Create WKRadar credentials table
-- This table stores custom Guacamole credentials for users
-- Default credentials are: username = first_name.last_name, password = REDACTED_SET_VIA_ENV

CREATE TABLE IF NOT EXISTS wkradar_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE wkradar_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do anything
CREATE POLICY "Admins can manage wkradar_credentials"
  ON wkradar_credentials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_unified
      WHERE users_unified.id = auth.uid()
      AND users_unified.role = 'ADMIN'
    )
  );

-- Policy: Users can read their own credentials
CREATE POLICY "Users can read own wkradar credentials"
  ON wkradar_credentials
  FOR SELECT
  USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_wkradar_credentials_user_id ON wkradar_credentials(user_id);
