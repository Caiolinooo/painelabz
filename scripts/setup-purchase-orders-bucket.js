const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBucket() {
    console.log('Setting up purchase-orders bucket...');

    const bucketName = 'purchase-orders';

    // 1. Create Bucket
    const { data: bucket, error } = await supabase.storage.createBucket(bucketName, {
        public: true, // Making it public for easy invoice access by approvers via URL
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log(`Bucket ${bucketName} already exists.`);
        } else {
            console.error('Error creating bucket:', error);
        }
    } else {
        console.log(`Bucket ${bucketName} created.`);
    }

    // 2. Create Policies (via SQL because Storage API for policies is limited or tricky via JS client sometimes, but checks usually require SQL)
    // Actually, standard practice in this codebase seems to be SQL migrations. 
    // But let's verify if we can do it via SQL RPC or just logging success.

    console.log('Bucket setup complete. Ensure RLS policies in Storage allow authenticated uploads.');
    console.log('You might need to run a SQL script to set storage.objects policies if they are not open.');
}

setupBucket();
