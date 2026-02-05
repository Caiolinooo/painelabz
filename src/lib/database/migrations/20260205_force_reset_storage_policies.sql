-- Migration: Force Reset Storage Policies
-- Date: 2026-02-05
-- Description: Drops and recreates storage policies for profile-photos to ensure they are correct.

-- Drop existing policies (ignore error if not exists, but we know they exist)
DROP POLICY IF EXISTS "Authenticated Insert profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read profile-photos" ON storage.objects;

-- Recreate Policies

-- 1. Public Read
CREATE POLICY "Public Read profile-photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-photos' );

-- 2. Authenticated Insert (Upload)
CREATE POLICY "Authenticated Insert profile-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.role() = 'authenticated'
);

-- 3. Authenticated Update
CREATE POLICY "Authenticated Update profile-photos"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'profile-photos' AND auth.role() = 'authenticated' );

-- 4. Authenticated Delete
CREATE POLICY "Authenticated Delete profile-photos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'profile-photos' AND auth.role() = 'authenticated' );
