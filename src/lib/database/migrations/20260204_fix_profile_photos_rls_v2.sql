-- Drop previous attempts to ensure clean slate
DROP POLICY IF EXISTS "Authenticated Insert profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete profile-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read profile-photos" ON storage.objects;

-- 1. Public Read (TO public)
CREATE POLICY "Public Read profile-photos"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'profile-photos' );

-- 2. Authenticated Insert (TO authenticated)
CREATE POLICY "Authenticated Insert profile-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'profile-photos' );

-- 3. Authenticated Update (TO authenticated)
CREATE POLICY "Authenticated Update profile-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'profile-photos' );

-- 4. Authenticated Delete (TO authenticated)
CREATE POLICY "Authenticated Delete profile-photos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'profile-photos' );
