require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');

// Try to load .env.local first, then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
    console.log(`Loading env from ${envLocalPath}`);
    require('dotenv').config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    console.log(`Loading env from ${envPath}`);
    require('dotenv').config({ path: envPath });
} else {
    console.warn('No .env or .env.local file found!');
}

const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED***;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and ***REMOVED*** must be defined in the .env file');
    process.exit(1);
}

// Helper function to execute SQL directly via REST API
async function executeSql(sql) {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'resolution=merge-duplicates'
            },
            body: ***REMOVED***
                query: sql
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error executing SQL: ${errorText}`);
            return { success: false, error: errorText };
        }

        const data = await response.text();
        return { success: true, data };
    } catch (error) {
        console.error('Exception executing SQL:', error);
        return { success: false, error: String(error) };
    }
}

async function runMigration() {
    const sqlPath = "C:/Users/Caio/.gemini/antigravity/brain/ce675cab-8103-4402-9cb6-2bbdaf0bd1f7/add_approval_tiers.sql";

    if (!fs.existsSync(sqlPath)) {
        console.error(`SQL file not found at: ${sqlPath}`);
        return;
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running migration...');

    // Run Migration
    const result = await executeSql(sql);
    if (result.success) {
        console.log('Migration executed successfully!');
    } else {
        console.error('Migration failed:', result.error);
    }

    // Refresh Schema Cache
    console.log('Refreshing Schema Cache...');
    const refreshResult = await executeSql("NOTIFY pgrst, 'reload config';");
    if (refreshResult.success) {
        console.log('Schema Cache Refreshed.');
    } else {
        console.error('Failed to refresh schema cache:', refreshResult.error);
    }
}

runMigration();
