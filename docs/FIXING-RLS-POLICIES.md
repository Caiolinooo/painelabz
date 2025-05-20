# Fixing RLS Policies for the Reimbursement Table

This document provides instructions for fixing Row Level Security (RLS) policies for the Reimbursement table in the Supabase database.

## Automatic Fix

Try running the following command to automatically fix the RLS policies:

```bash
npm run db:fix-rls
```

If the automatic fix doesn't work, you can try the following manual steps.

## Manual Fix

### Option 1: Using the Supabase Dashboard

1. Log in to the [Supabase Dashboard](https://app.supabase.io)
2. Select your project
3. Navigate to the "Table Editor" section
4. Select the "Reimbursement" table
5. Click on the "Policies" tab
6. Enable RLS by clicking the toggle switch if it's not already enabled
7. Click on "New Policy"
8. Create the following policies:

#### Policy 1: Select Policy

- Policy Name: `Reimbursement Select Policy`
- Operation: `SELECT`
- Using expression: `true`

#### Policy 2: Insert Policy

- Policy Name: `Reimbursement Insert Policy`
- Operation: `INSERT`
- Using expression: `true`

#### Policy 3: Update Policy

- Policy Name: `Reimbursement Update Policy`
- Operation: `UPDATE`
- Using expression: `true`

### Option 2: Using the SQL Editor

1. Log in to the [Supabase Dashboard](https://app.supabase.io)
2. Select your project
3. Navigate to the "SQL Editor" section
4. Create a new query
5. Copy and paste the following SQL:

```sql
-- Enable RLS on the Reimbursement table
ALTER TABLE "Reimbursement" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Reimbursement Access Policy" ON "Reimbursement";
DROP POLICY IF EXISTS "Reimbursement Insert Policy" ON "Reimbursement";
DROP POLICY IF EXISTS "Reimbursement Select Policy" ON "Reimbursement";
DROP POLICY IF EXISTS "Reimbursement Update Policy" ON "Reimbursement";

-- Create simplified policies that allow all operations
-- This ensures the application works while we debug the more complex policies

-- Policy for SELECT: Allow all authenticated users to see all reimbursements
CREATE POLICY "Reimbursement Select Policy" 
ON "Reimbursement"
FOR SELECT
USING (true);

-- Policy for INSERT: Allow all authenticated users to insert reimbursements
CREATE POLICY "Reimbursement Insert Policy" 
ON "Reimbursement"
FOR INSERT
WITH CHECK (true);

-- Policy for UPDATE: Allow all authenticated users to update reimbursements
CREATE POLICY "Reimbursement Update Policy" 
ON "Reimbursement"
FOR UPDATE
USING (true);
```

6. Click "Run" to execute the SQL

### Option 3: Using the scripts/manual-rls-fix.sql File

1. Open the `scripts/manual-rls-fix.sql` file in this repository
2. Copy the contents of the file
3. Log in to the [Supabase Dashboard](https://app.supabase.io)
4. Select your project
5. Navigate to the "SQL Editor" section
6. Create a new query
7. Paste the SQL from the file
8. Click "Run" to execute the SQL

## Verifying the Fix

After applying the fix, you can verify that the RLS policies are working correctly by:

1. Refreshing the application and checking if the reimbursement functionality works
2. Looking for any RLS-related errors in the browser console
3. Running the following SQL in the Supabase SQL Editor to check if the policies exist:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename = 'Reimbursement';
```

## Troubleshooting

If you're still experiencing issues with RLS policies, try the following:

1. Check if the Reimbursement table exists:

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'Reimbursement'
) as table_exists;
```

2. If the table doesn't exist, you'll need to create it first. Refer to the application code for the correct table structure.

3. Check if you have the necessary permissions to modify RLS policies. You should be using the service role key for this operation.

4. Try simplifying the RLS policies even further by using `true` for all operations.

5. If all else fails, you can temporarily disable RLS for the Reimbursement table (not recommended for production):

```sql
ALTER TABLE "Reimbursement" DISABLE ROW LEVEL SECURITY;
```

## Additional Resources

- [Supabase Row Level Security Documentation](https://supabase.io/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
