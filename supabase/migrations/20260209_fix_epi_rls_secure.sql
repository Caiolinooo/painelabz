-- Create a secure function to check user permissions (bypassing RLS)
CREATE OR REPLACE FUNCTION check_user_permission(required_role text DEFAULT NULL, required_module text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the function creator (postgres/superuser)
SET search_path = public -- Secure search path
AS $$
DECLARE
  user_role text;
  user_permissions jsonb;
BEGIN
  -- Get user role and permissions in one query
  SELECT role, access_permissions INTO user_role, user_permissions
  FROM users_unified
  WHERE id = auth.uid();

  -- 1. Check Role (if provided)
  IF required_role IS NOT NULL THEN
    IF required_role = 'ADMIN' AND user_role = 'ADMIN' THEN
      RETURN true;
    END IF;
    IF required_role = 'MANAGER' AND user_role IN ('ADMIN', 'MANAGER') THEN
      RETURN true;
    END IF;
  END IF;

  -- 2. Check Module Permission (if provided)
  -- Admins always have access
  IF user_role = 'ADMIN' THEN
    RETURN true;
  END IF;

  IF required_module IS NOT NULL THEN
    -- Check old structure (flat 'epi': true)
    IF (user_permissions->>required_module)::boolean = true THEN
      RETURN true;
    END IF;
    -- Check new structure (modules: { 'epi': true })
    IF (user_permissions->'modules'->>required_module)::boolean = true THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins and Managers can view sector responsibles" ON epi_sector_responsibles;
DROP POLICY IF EXISTS "Admins and Managers can insert sector responsibles" ON epi_sector_responsibles;
DROP POLICY IF EXISTS "Admins and Managers can delete sector responsibles" ON epi_sector_responsibles;

-- Re-create policies using the secure function
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
