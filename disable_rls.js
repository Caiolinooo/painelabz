const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        // Temporarily disable RLS to rule out permission issues
        await client.query('ALTER TABLE public.man_schedules DISABLE ROW LEVEL SECURITY;');
        console.log("RLS disabled.");
        
        // Also check if there's data
        const res = await client.query('SELECT count(*) FROM public.man_schedules');
        console.log("Row count:", res.rows[0].count);
    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        await client.end();
    }
}
run();
