-- Enable RLS on objects if not already (it usually is)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Allow Public Read for profile-photos
DROP POLICY IF EXISTS "Public Read profile-photos" ON storage.objects;
CREATE POLICY "Public Read profile-photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-photos' );

-- 2. Allow Authenticated Insert for profile-photos
DROP POLICY IF EXISTS "Authenticated Insert profile-photos" ON storage.objects;
CREATE POLICY "Authenticated Insert profile-photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.role() = 'authenticated'
);

-- 3. Allow Authenticated Update (optional, replacing files)
DROP POLICY IF EXISTS "Authenticated Update profile-photos" ON storage.objects;
CREATE POLICY "Authenticated Update profile-photos"
ON storage.objects FOR UPDATE
USING ( context_bucket_id = 'profile-photos' AND auth.role() = 'authenticated' );

-- 4. Allow Authenticated Delete
DROP POLICY IF EXISTS "Authenticated Delete profile-photos" ON storage.objects;
CREATE POLICY "Authenticated Delete profile-photos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'profile-photos' AND auth.role() = 'authenticated' );
