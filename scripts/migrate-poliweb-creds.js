const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Adding columns to poliweb_credentials...');
    
    const { error } = await supabase.rpc('exec_sql', {
        sql: `
            ALTER TABLE poliweb_credentials ADD COLUMN IF NOT EXISTS username_novo VARCHAR(255);
            ALTER TABLE poliweb_credentials ADD COLUMN IF NOT EXISTS password_novo VARCHAR(255);
            ALTER TABLE poliweb_credentials ADD COLUMN IF NOT EXISTS username_antigo VARCHAR(255);
            ALTER TABLE poliweb_credentials ADD COLUMN IF NOT EXISTS password_antigo VARCHAR(255);
        `
    });
    
    if (error) {
        console.log('RPC error, trying direct query...');
        
        // Try each column separately
        const columns = [
            'ALTER TABLE poliweb_credentials ADD COLUMN IF NOT EXISTS username_novo VARCHAR(255)',
            'ALTER TABLE poliweb_credentials ADD COLUMN IF NOT EXISTS password_novo VARCHAR(255)',
            'ALTER TABLE poliweb_credentials ADD COLUMN IF NOT EXISTS username_antigo VARCHAR(255)',
            'ALTER TABLE poliweb_credentials ADD COLUMN IF NOT EXISTS password_antigo VARCHAR(255)'
        ];
        
        for (const sql of columns) {
            const { error: colError } = await supabase.rpc('exec_sql', { sql });
            if (colError) {
                console.log('Error:', colError.message);
            } else {
                console.log('OK:', sql);
            }
        }
    } else {
        console.log('Migration successful!');
    }
    
    process.exit(0);
}

migrate();