import * as fs from 'fs';
import * as path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = ***REMOVED*** 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1]] = match[2].trim();
        }
    });
}

import { getSupabaseAdmin } from '../src/lib/supabase';

async function run() {
    const supabase = await getSupabaseAdmin();
    
    console.log("Checking triggers in auth schema...");
    const { data: authTriggers, error: errAuth } = await supabase
        .rpc('execute_sql', { query: `
            SELECT 
                tgname AS trigger_name,
                relname AS table_name,
                proname AS function_name
            FROM pg_trigger
            JOIN pg_class ON pg_class.oid = tgrelid
            JOIN pg_namespace ON pg_namespace.oid = relnamespace
            JOIN pg_proc ON pg_proc.oid = tgfoid
            WHERE nspname = 'auth' OR relname = 'users';
        ` });
    
    if (errAuth) {
        // If RPC isn't available, we'll run a raw select if allowed, or we can use another method.
        console.log("RPC execute_sql failed:", errAuth);
    } else {
        console.log("Triggers:", authTriggers);
    }

    // Let's also check if execute_sql function exists or if we can run it via a select query if we have service role client
    console.log("Attempting direct select from users_unified triggers...");
    const { data: publicTriggers, error: errPublic } = await supabase
        .rpc('execute_sql', { query: `
            SELECT 
                tgname AS trigger_name,
                relname AS table_name,
                proname AS function_name
            FROM pg_trigger
            JOIN pg_class ON pg_class.oid = tgrelid
            JOIN pg_namespace ON pg_namespace.oid = relnamespace
            JOIN pg_proc ON pg_proc.oid = tgfoid
            WHERE relname = 'users_unified' OR relname = 'profiles';
        ` });
    console.log("Public Triggers:", publicTriggers, "Error:", errPublic);
}

run();
