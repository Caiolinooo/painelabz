-- Add ca_number to epi_registrations to allow overriding the default type CA
ALTER TABLE epi_registrations
ADD COLUMN IF NOT EXISTS equipment_ca TEXT;

-- Create table for sector responsibles
CREATE TABLE IF NOT EXISTS epi_sector_responsibles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sector_id TEXT NOT NULL, -- Matching the department/sector ID or name used in users table
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sector_id, user_id)
);

-- RLS Policies for epi_sector_responsibles

ALTER TABLE epi_sector_responsibles ENABLE ROW LEVEL SECURITY;

-- Admins and Managers can view and manage responsibles
CREATE POLICY "Admins and Managers can view sector responsibles"
ON epi_sector_responsibles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users_unified
    WHERE users_unified.id = auth.uid()
    AND (users_unified.role IN ('ADMIN', 'MANAGER') OR users_unified.access_permissions->>'epi' = 'true')
  )
);

CREATE POLICY "Admins and Managers can insert sector responsibles"
ON epi_sector_responsibles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users_unified
    WHERE users_unified.id = auth.uid()
    AND (users_unified.role IN ('ADMIN', 'MANAGER') OR users_unified.access_permissions->>'epi' = 'true')
  )
);

CREATE POLICY "Admins and Managers can delete sector responsibles"
ON epi_sector_responsibles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users_unified
    WHERE users_unified.id = auth.uid()
    AND (users_unified.role IN ('ADMIN', 'MANAGER') OR users_unified.access_permissions->>'epi' = 'true')
  )
);
