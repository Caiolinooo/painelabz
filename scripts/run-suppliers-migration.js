require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = ***REMOVED***;
const ***REMOVED*** = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, ***REMOVED***, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    try {
        console.log('Reading migration file...');
        const sql = fs.readFileSync('src/lib/database/migrations/20260223_create_suppliers_tables.sql', 'utf8');

        console.log('Executing SQL...');
        const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('Error applying migration (try 1):', error.message);
            const { data: d2, error: e2 } = await supabaseAdmin.rpc('execute_sql', { sql });
            if (e2) {
                console.error('Error applying migration (try 2):', e2.message);
            } else {
                console.log('Successfully applied migration on try 2!', d2);
            }
        } else {
            console.log('Successfully applied migration!', data);
        }
    } catch (err) {
        console.error('EXCEPTION CAUGHT:', err);
    }
}

run();
