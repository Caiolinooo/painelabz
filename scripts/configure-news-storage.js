/**
 * Script to configure RLS policies for the 'news' storage bucket
 * allow public read, authenticated insert/update/delete
 */

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

async function configureNewsBucket() {
    try {
        console.log('Starting news bucket configuration...');

        // 1. Check/Create bucket
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) throw bucketsError;

        let newsBucket = buckets.find(b => b.name === 'news');

        if (!newsBucket) {
            console.log("Creating 'news' bucket...");
            const { data, error } = await supabase.storage.createBucket('news', {
                public: true,
                fileSizeLimit: 104857600, // 100MB
                allowedMimeTypes: ['image/*', 'video/*']
            });
            if (error) throw error;
            newsBucket = data;
            console.log("'news' bucket created.");
        } else {
            console.log("'news' bucket already exists.");
            // Ensure it's public
            if (!newsBucket.public) {
                console.log("Updating 'news' bucket to be public...");
                const { error } = await supabase.storage.updateBucket('news', {
                    public: true,
                    fileSizeLimit: 104857600,
                    allowedMimeTypes: ['image/*', 'video/*']
                });
                if (error) console.error("Error updating bucket:", error);
            }
        }

        // 2. We can't easily create complex SQL RLS policies via JS client (requires SQL execution).
        // However, if we just made it public, that handles READs.
        // For INSERTs/UPDATES, we usually need policies.
        // But since we are using the Service Key here, we bypass RLS for setup.
        // The Client Side will use Anon Key, so it NEEDS RLS policies.

        console.log('\n=== MANUAL ACTION REQUIRED ===');
        console.log('You must ensure the following RLS policies exist for the "news" bucket in Supabase Dashboard:');
        console.log('1. SELECT: Public (or Authenticated) - Already enabled if bucket is Public');
        console.log('2. INSERT: Authenticated users');
        console.log('   (bucket_id = \'news\' AND auth.role() = \'authenticated\')');
        console.log('3. UPDATE: Authenticated users (Owners)');
        console.log('   (bucket_id = \'news\' AND auth.role() = \'authenticated\' AND (storage.foldername(name))[1] = \'posts\')');

        // Attempt to create a test file to verify Access (using SERVICE key, so it should work)
        console.log('\nVerifying Service Key access...');
        const { error: uploadError } = await supabase.storage.from('news').upload('test-config.txt', 'test', { upsert: true });
        if (uploadError) console.error('Service Key Upload failed:', uploadError);
        else console.log('Service Key Upload successful.');

        return true;
    } catch (error) {
        console.error('Error configuring bucket:', error);
        return false;
    }
}

configureNewsBucket();
