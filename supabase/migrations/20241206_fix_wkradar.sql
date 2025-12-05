-- Fix WKRadar credentials table
-- Drops and recreates the table to remove the invalid Foreign Key to users_unified (which is likely a view)
-- This ensures the table can be created successfully

DROP TABLE IF EXISTS wkradar_credentials;

CREATE TABLE wkradar_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Removed FK to users_unified to avoid errors if it's a view
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
