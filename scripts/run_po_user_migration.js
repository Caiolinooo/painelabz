const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey);

async function runMigration() {
    const sqlPath = path.join(__dirname, '../src/lib/database/migrations/update_po_configs_for_users.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');

    // Split by statement if needed, or run generic sql executor if available
    // But postgres-js or similar is not here. 
    // We can use the rpc call if we have an `exec_sql` function.
    // Standard project migrations seem to use a script setup.
    // Let's check if there is an `exec_sql` or similar RPC function.
    // Usually `scripts/create-execute-sql-function.js` creates logical access.

    // Try to use Supabase REST API via a known RPC function 'exec_sql' or 'execute_sql'

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.log('RPC exec_sql failed or not found, trying raw execute via postgres if possible, or failing.');
        console.error(error);

        // Fallback: If exec_sql doesn't exist, we might not be able to run DDL via JS client without it.
    } else {
        console.log('Migration executed successfully via exec_sql');
    }
}

runMigration();
