-- Fix Storage RLS for library-assets with Custom Auth
-- The application uses a custom JWT which:
-- 1. Does NOT set 'sub' (sets 'userId')
-- 2. Sets 'role' to 'ADMIN'/'USER' instead of mapping to 'authenticated' role claim or ensuring auth.role() works as expected.

DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can upload library assets" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view library assets" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete library assets" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update library assets" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can upload library assets" ON storage.objects;
    DROP POLICY IF EXISTS "Allow uploads with custom token" ON storage.objects;
END $$;

-- 1. Allow public read access
create policy "Anyone can view library assets"
on storage.objects for select
using ( bucket_id = 'library-assets' );

-- 2. Allow uploads based on Custom JWT Claims
-- We check if the JWT 'role' claim is one of our expected roles.
create policy "Allow uploads with custom token"
on storage.objects for insert
with check (
  bucket_id = 'library-assets' and (
    auth.role() = 'authenticated' OR
    (auth.jwt() ->> 'role') IN ('ADMIN', 'USER', 'MANAGER')
  )
);

-- 3. Allow deletes (checking userId to verify ownership would be ideal, but for now allow role-based access for Admins)
create policy "Allow deletes with custom token"
on storage.objects for delete
using (
  bucket_id = 'library-assets' and (
    auth.role() = 'authenticated' OR
    (auth.jwt() ->> 'role') IN ('ADMIN', 'USER', 'MANAGER')
  )
);

-- 4. Allow updates
create policy "Allow updates with custom token"
on storage.objects for update
using (
  bucket_id = 'library-assets' and (
    auth.role() = 'authenticated' OR
    (auth.jwt() ->> 'role') IN ('ADMIN', 'USER', 'MANAGER')
  )
);
