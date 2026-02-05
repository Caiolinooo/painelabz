-- Drop previous attempts to ensure clean slate
DROP POLICY IF EXISTS "Authenticated Insert profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read profile-photos" ON storage.objects;

-- 1. Public Read (TO public - no change)
CREATE POLICY "Public Read profile-photos"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'profile-photos' );

-- 2. Authenticated Insert (TO public, but checking auth.role() in logic)
-- This avoids issues where the Postgres role might not match 'authenticated' exactly due to custom claims
CREATE POLICY "Authenticated Insert profile-photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.role() = 'authenticated'
);

-- 3. Authenticated Update (TO public, checking auth in logic)
CREATE POLICY "Authenticated Update profile-photos"
ON storage.objects FOR UPDATE
TO public
USING ( bucket_id = 'profile-photos' AND auth.role() = 'authenticated' )
WITH CHECK ( bucket_id = 'profile-photos' AND auth.role() = 'authenticated' );

-- 4. Authenticated Delete (TO public, checking auth in logic)
CREATE POLICY "Authenticated Delete profile-photos"
ON storage.objects FOR DELETE
TO public
USING ( bucket_id = 'profile-photos' AND auth.role() = 'authenticated' );
