-- Migration: Robust Storage Policies (Take 3)
-- Date: 2026-02-05
-- Description: Explicitly defines policies for profile-photos accommodating the specific folder structure used by the frontend.

-- Drop all policies for this bucket again to be sure
DROP POLICY IF EXISTS "Authenticated Insert profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Detailed Insert profile-photos" ON storage.objects;

-- Recreate with specific folder allowances (optional but good for clarity)
-- But primarily ensuring 'authenticated' is working.

-- 1. Public Read (Anyone can view)
CREATE POLICY "Public Read profile-photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-photos' );

-- 2. Authenticated Insert (Upload)
-- Explicitly allowing uploads to 'covers/' and 'avatars/' folders or root, 
-- but primarily ensuring the bucket match is robust.
CREATE POLICY "Authenticated Insert profile-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND auth.role() = 'authenticated'
);

-- 3. Authenticated Update
CREATE POLICY "Authenticated Update profile-photos"
ON storage.objects FOR UPDATE
USING ( context_bucket_id = 'profile-photos' AND auth.role() = 'authenticated' );

-- 4. Authenticated Delete
CREATE POLICY "Authenticated Delete profile-photos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'profile-photos' AND auth.role() = 'authenticated' );
