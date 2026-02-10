-- 1. Ensure the function has correct ownership and permissions
CREATE OR REPLACE FUNCTION check_user_permission(required_role text DEFAULT NULL, required_module text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  user_role text;
  user_permissions jsonb;
BEGIN
  current_user_id := auth.uid();
  
  -- Prevent errors if no user is logged in
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get user role and permissions directly
  SELECT role, access_permissions INTO user_role, user_permissions
  FROM users_unified
  WHERE id = current_user_id;

  -- 1. Check Role (if provided)
  IF required_role IS NOT NULL THEN
    IF required_role = 'ADMIN' AND user_role = 'ADMIN' THEN
      RETURN true;
    END IF;
    IF required_role = 'MANAGER' AND user_role IN ('ADMIN', 'MANAGER') THEN
      RETURN true;
    END IF;
  END IF;

  -- 2. Check Module Permission
  IF user_role = 'ADMIN' THEN
    RETURN true;
  END IF;

  IF required_module IS NOT NULL THEN
    IF (user_permissions->>required_module)::boolean = true THEN
      RETURN true;
    END IF;
    IF (user_permissions->'modules'->>required_module)::boolean = true THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION check_user_permission TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_permission TO service_role;

-- 2. Fix users_unified recursion by using the function
-- First, drop the problematic policy
DROP POLICY IF EXISTS users_unified_select_policy ON users_unified;

-- Re-create it using the secure function to break recursion
CREATE POLICY users_unified_select_policy ON users_unified
FOR SELECT USING (
  auth.uid() = id OR
  check_user_permission('ADMIN')
);

-- 3. Ensure epi_sector_responsibles policies use the function (re-apply to be safe)
DROP POLICY IF EXISTS "Admins and Managers can view sector responsibles" ON epi_sector_responsibles;
DROP POLICY IF EXISTS "Admins and Managers can insert sector responsibles" ON epi_sector_responsibles;
DROP POLICY IF EXISTS "Admins and Managers can delete sector responsibles" ON epi_sector_responsibles;

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

-- 4. Grant Table Permissions (just in case)
GRANT ALL ON epi_sector_responsibles TO authenticated;
GRANT ALL ON epi_sector_responsibles TO service_role;
