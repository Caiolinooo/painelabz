const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const connectionString = process.env.DATABASE_URL;
    const client = new Client({ connectionString });
    
    try {
        await client.connect();
        const sql = fs.readFileSync('supabase/migrations/20260330150000_create_man_schedules.sql', 'utf8');
        await client.query(sql);
        console.log("Migration applied successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await client.end();
    }
}
run();
