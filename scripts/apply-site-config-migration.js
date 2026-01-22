const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const migrationPath = path.join(process.cwd(), 'src/lib/database/migrations/create-site-config-table.sql');
    console.log('Reading migration:', migrationPath);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing SQL...');
    // Try using rpc exec_sql first
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Error with RPC exec_sql:', error);
        console.log('Attempting direct fallback (unlikely to work without direct pg connection but trying...)');
        // If you had a direct PG client here you'd use it. Supabase-js relies on RPC for raw SQL usually.
    } else {
        console.log('Success!');
    }
}

run();
