-- 1. Create a helper to safely get role without triggering RLS recursively
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct select bypasses RLS because of SECURITY DEFINER
  RETURN (SELECT role FROM users_unified WHERE id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role TO service_role;

-- 2. Clean up ALL existing conflicting policies on users_unified
DROP POLICY IF EXISTS "users_unified_select_policy" ON users_unified;
DROP POLICY IF EXISTS "Enable read for own user" ON users_unified;
DROP POLICY IF EXISTS "users_unified_insert_policy" ON users_unified;
DROP POLICY IF EXISTS "users_unified_update_policy" ON users_unified;
DROP POLICY IF EXISTS "Enable update for own user" ON users_unified;
DROP POLICY IF EXISTS "users_unified_delete_policy" ON users_unified;

-- 3. Re-create clean, non-recursive policies
CREATE POLICY "users_unified_select_policy" ON users_unified
FOR SELECT USING (
  auth.uid() = id OR
  get_my_role() = 'ADMIN'
);

CREATE POLICY "users_unified_insert_policy" ON users_unified
FOR INSERT WITH CHECK (
  get_my_role() = 'ADMIN'
);

CREATE POLICY "users_unified_update_policy" ON users_unified
FOR UPDATE USING (
  auth.uid() = id OR
  get_my_role() = 'ADMIN'
);

CREATE POLICY "users_unified_delete_policy" ON users_unified
FOR DELETE USING (
  get_my_role() = 'ADMIN'
);

-- 4. Ensure epi_sector_responsibles policies are still correct (they rely on check_user_permission)
-- check_user_permission is theoretically fine now because it is SECURITY DEFINER and 
-- even if it queries users_unified, it does so as postgres/owner, bypassing these new policies.
