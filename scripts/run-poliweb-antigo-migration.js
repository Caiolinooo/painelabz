const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
        'postgresql://postgres.' + process.env.SUPABASE_DB_USER.split('.')[1] + ':' + 
        process.env.SUPABASE_DB_PASSWORD + '@' + 
        process.env.SUPABASE_DB_HOST + ':' + 
        process.env.SUPABASE_DB_PORT + '/' + 
        process.env.SUPABASE_DB_NAME + '?sslmode=require'
});

async function runMigration() {
    try {
        console.log('Running migration for antigo credentials...\n');
        
        const sql = `
            ALTER TABLE poliweb_credentials 
            ADD COLUMN IF NOT EXISTS username_antigo VARCHAR(255),
            ADD COLUMN IF NOT EXISTS password_antigo VARCHAR(255);
        `;
        
        await pool.query(sql);
        console.log('✅ Migration successful!\n');
        
        // Verify columns
        const { rows } = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'poliweb_credentials' 
            ORDER BY ordinal_position;
        `);
        
        console.log('Table columns:');
        rows.forEach(r => console.log('  - ' + r.column_name));
        
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

runMigration();
