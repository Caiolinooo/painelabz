-- Migration: Strict User Folder Policies
-- Date: 2026-02-05
-- Description: Updates policies to strictly allow users to only manage their own folders (User ID matches folder name).

-- Drop previous policies
DROP POLICY IF EXISTS "Authenticated Insert profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read profile-photos" ON storage.objects;

-- 1. Public Read (Anyone can view)
CREATE POLICY "Public Read profile-photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-photos' );

-- 2. Authenticated Insert (Upload)
-- User can only upload to a folder named after their User ID.
CREATE POLICY "Authenticated Insert profile-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Authenticated Update
CREATE POLICY "Authenticated Update profile-photos"
ON storage.objects FOR UPDATE
USING ( 
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Authenticated Delete
CREATE POLICY "Authenticated Delete profile-photos"
ON storage.objects FOR DELETE
USING ( 
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
