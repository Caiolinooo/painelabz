-- SQL script to make the comprovantes bucket public and configure RLS policies
-- Run this script in the Supabase SQL Editor

-- Make the comprovantes bucket public (this bypasses RLS policies)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Even though the bucket is public, we'll still create RLS policies for when you want to switch back to private
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow all authenticated users to read files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to insert files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all authenticated users to delete files" ON storage.objects;

-- Create policies for authenticated users
-- Allow all authenticated users to read files
CREATE POLICY "Allow all authenticated users to read files"
ON storage.objects
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND bucket_id = 'comprovantes'
);

-- Allow all authenticated users to insert files
CREATE POLICY "Allow all authenticated users to insert files"
ON storage.objects
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND bucket_id = 'comprovantes'
);

-- Allow all authenticated users to update files
CREATE POLICY "Allow all authenticated users to update files"
ON storage.objects
FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND bucket_id = 'comprovantes'
);

-- Allow all authenticated users to delete files
CREATE POLICY "Allow all authenticated users to delete files"
ON storage.objects
FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND bucket_id = 'comprovantes'
);

-- Verify the bucket is public
SELECT id, name, public FROM storage.buckets WHERE id = 'comprovantes';

-- Verify the policies were created
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  definition
FROM
  pg_policies
WHERE
  tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE 'Allow all authenticated users%';
