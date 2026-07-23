require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    try {
        console.log('Testing connection to DB...');
        const { data, error } = await supabaseAdmin
            .from('suppliers')
            .select('*')
            .limit(1);

        if (error) {
            console.error('SUPABASE ERROR:', error);
            console.error(String(error));
            console.error(Object.keys(error));
        } else {
            console.log('SUCCESS, fetched rows:', data ? data.length : 0);
        }
    } catch (err) {
        console.error('EXCEPTION CAUGHT:', err);
    }
}

run();
