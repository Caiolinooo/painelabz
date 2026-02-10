-- Ensure users_unified has access_permissions column if it doesn't already
ALTER TABLE users_unified ADD COLUMN IF NOT EXISTS access_permissions JSONB DEFAULT '{}'::jsonb;

-- Drop existing policies on epi_sector_responsibles to avoid conflicts
DROP POLICY IF EXISTS "Admins and Managers can view sector responsibles" ON epi_sector_responsibles;
DROP POLICY IF EXISTS "Admins and Managers can insert sector responsibles" ON epi_sector_responsibles;
DROP POLICY IF EXISTS "Admins and Managers can delete sector responsibles" ON epi_sector_responsibles;

-- Enable RLS just in case
ALTER TABLE epi_sector_responsibles ENABLE ROW LEVEL SECURITY;

-- Re-create policies with robust checks
CREATE POLICY "Admins and Managers can view sector responsibles"
ON epi_sector_responsibles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users_unified
    WHERE users_unified.id = auth.uid()
    AND (
      users_unified.role IN ('ADMIN', 'MANAGER') 
      OR (users_unified.access_permissions->>'epi')::boolean = true
      OR (users_unified.access_permissions->'modules'->>'epi')::boolean = true
    )
  )
);

CREATE POLICY "Admins and Managers can insert sector responsibles"
ON epi_sector_responsibles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users_unified
    WHERE users_unified.id = auth.uid()
    AND (
      users_unified.role IN ('ADMIN', 'MANAGER') 
      OR (users_unified.access_permissions->>'epi')::boolean = true
      OR (users_unified.access_permissions->'modules'->>'epi')::boolean = true
    )
  )
);

CREATE POLICY "Admins and Managers can delete sector responsibles"
ON epi_sector_responsibles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users_unified
    WHERE users_unified.id = auth.uid()
    AND (
      users_unified.role IN ('ADMIN', 'MANAGER') 
      OR (users_unified.access_permissions->>'epi')::boolean = true
      OR (users_unified.access_permissions->'modules'->>'epi')::boolean = true
    )
  )
);
