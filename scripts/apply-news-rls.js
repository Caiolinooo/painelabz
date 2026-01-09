require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined in the .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const SQL_COMMANDS = `
-- Enable RLS (idempotent)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Public
DROP POLICY IF EXISTS "News Select Public" ON storage.objects;
CREATE POLICY "News Select Public" ON storage.objects FOR SELECT
USING ( bucket_id = 'news' );

-- 2. INSERT: Authenticated users
DROP POLICY IF EXISTS "News Insert Authenticated" ON storage.objects;
CREATE POLICY "News Insert Authenticated" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'news' AND auth.role() = 'authenticated' );

-- 3. UPDATE: Owners
DROP POLICY IF EXISTS "News Update Owners" ON storage.objects;
CREATE POLICY "News Update Owners" ON storage.objects FOR UPDATE
USING ( bucket_id = 'news' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'news' AND auth.uid() = owner );

-- 4. DELETE: Owners
DROP POLICY IF EXISTS "News Delete Owners" ON storage.objects;
CREATE POLICY "News Delete Owners" ON storage.objects FOR DELETE
USING ( bucket_id = 'news' AND auth.uid() = owner );
`;

async function applyRLS() {
    console.log('Attempting to apply RLS policies for "news" bucket...');

    try {
        // Try to call existing 'exec_sql' RPC if available
        const { error } = await supabase.rpc('exec_sql', { query: SQL_COMMANDS });

        if (error) {
            console.warn('RPC "exec_sql" failed or does not exist:', error.message);
            throw new Error('RPC_FAILED');
        }
        console.log('Successfully applied RLS policies via RPC.');
        return true;

    } catch (err) {
        console.log('\n❌ Could not apply policies automatically (RPC unavailable).');
        console.log('✅ PLEASE RUN THE FOLLOWING SQL IN SUPABASE SQL EDITOR:\n');
        console.log('---------------------------------------------------');
        console.log(SQL_COMMANDS);
        console.log('---------------------------------------------------');
        return false;
    }
}

applyRLS();
