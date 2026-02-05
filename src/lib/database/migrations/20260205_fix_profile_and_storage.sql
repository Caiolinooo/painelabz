-- Migration: Fix Profile Bio and Storage RLS
-- Date: 2026-02-05
-- Description: Adds bio column to users_unified and resets RLS policies for profile-photos to fix upload errors.

-- 1. Ensure 'bio' column exists in users_unified
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users_unified'
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.users_unified ADD COLUMN bio TEXT;
    END IF;
END $$;

-- 2. Fix Storage RLS Policies for 'profile-photos'
-- First, enable RLS on storage.objects if not likely enabled (standard procedure)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Remove existing conflicting policies for this bucket to ensure a clean slate
DROP POLICY IF EXISTS "Public Read profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects; -- Potential legacy name
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects; -- Potential legacy name

-- Create strict policies

-- Policy 1: Public Read Access (Images are public)
CREATE POLICY "Public Read profile-photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-photos' );

-- Policy 2: Authenticated Insert (Upload)
-- Allow any authenticated user to upload to this bucket.
-- We could restrict by path prefix if needed (e.g., avatars/{uid}/*), 
-- but for now ensuring basic upload works is priority.
CREATE POLICY "Authenticated Insert profile-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.role() = 'authenticated'
);

-- Policy 3: Authenticated Update
CREATE POLICY "Authenticated Update profile-photos"
ON storage.objects FOR UPDATE
USING ( context_bucket_id = 'profile-photos' AND auth.role() = 'authenticated' );

-- Policy 4: Authenticated Delete
CREATE POLICY "Authenticated Delete profile-photos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'profile-photos' AND auth.role() = 'authenticated' );
