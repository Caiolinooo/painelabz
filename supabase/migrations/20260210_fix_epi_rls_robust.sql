-- Ultra-robust permission check function
CREATE OR REPLACE FUNCTION check_user_permission(required_role text DEFAULT NULL, required_module text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Runs as superuser to bypass RLS on users_unified
SET search_path = public -- Secure search path
AS $$
DECLARE
  current_user_id uuid;
  user_role text;
  user_permissions jsonb;
BEGIN
  current_user_id := auth.uid();
  
  -- 1. Fail fast if not authenticated
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Get user role and permissions directly from the table
  -- We use a direct SELECT here. Since this is SECURITY DEFINER, it bypasses RLS on users_unified.
  SELECT role, access_permissions INTO user_role, user_permissions
  FROM users_unified
  WHERE id = current_user_id;

  -- 3. Check Role (if provided)
  IF required_role IS NOT NULL THEN
    -- Admin has access to everything
    IF user_role = 'ADMIN' THEN
      RETURN true;
    END IF;
    
    -- Manager check
    IF required_role = 'MANAGER' AND user_role IN ('ADMIN', 'MANAGER') THEN
      RETURN true;
    END IF;
  END IF;

  -- 4. Check Module Permission
  -- Admin always has access
  IF user_role = 'ADMIN' THEN
    RETURN true;
  END IF;

  IF required_module IS NOT NULL THEN
    -- Robust JSON check using COALESCE to handle nulls
    -- Check old structure (flat 'epi': true)
    IF COALESCE((user_permissions->>required_module)::boolean, false) = true THEN
      RETURN true;
    END IF;
    
    -- Check new structure (modules: { 'epi': true })
    IF COALESCE((user_permissions->'modules'->>required_module)::boolean, false) = true THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION check_user_permission TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_permission TO service_role;

-- Re-apply policies on epi_sector_responsibles
DROP POLICY IF EXISTS "Admins and Managers can view sector responsibles" ON epi_sector_responsibles;
DROP POLICY IF EXISTS "Admins and Managers can insert sector responsibles" ON epi_sector_responsibles;
DROP POLICY IF EXISTS "Admins and Managers can delete sector responsibles" ON epi_sector_responsibles;
DROP POLICY IF EXISTS "Admins and Managers can update sector responsibles" ON epi_sector_responsibles; 

CREATE POLICY "Admins and Managers can view sector responsibles"
ON epi_sector_responsibles FOR SELECT
USING (
  check_user_permission('MANAGER', 'epi')
);

CREATE POLICY "Admins and Managers can insert sector responsibles"
ON epi_sector_responsibles FOR INSERT
WITH CHECK (
  check_user_permission('MANAGER', 'epi')
);

CREATE POLICY "Admins and Managers can delete sector responsibles"
ON epi_sector_responsibles FOR DELETE
USING (
  check_user_permission('MANAGER', 'epi')
);

CREATE POLICY "Admins and Managers can update sector responsibles"
ON epi_sector_responsibles FOR UPDATE
USING (
  check_user_permission('MANAGER', 'epi')
);

-- Ensure RLS is enabled
ALTER TABLE epi_sector_responsibles ENABLE ROW LEVEL SECURITY;

-- Grant necessary table permissions
GRANT ALL ON epi_sector_responsibles TO authenticated;
GRANT ALL ON epi_sector_responsibles TO service_role;
