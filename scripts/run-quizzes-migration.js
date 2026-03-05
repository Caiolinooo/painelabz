require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Missing DATABASE_URL in .env.local');
    process.exit(1);
}

const client = new Client({
    connectionString,
});

async function main() {
    try {
        await client.connect();
        console.log('Connected to PG Database.');

        console.log('Checking if academy_questions table exists...');
        const res = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'academy_questions'
      );
    `);

        if (res.rows[0].exists) {
            console.log('Table academy_questions already exists. We should run a schema cache reload to be safe.');
        } else {
            console.log('Table academy_questions DOES NOT EXIST. Re-applying migration...');
            const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260302_create_academy_quizzes.sql');
            const sql = fs.readFileSync(sqlPath, 'utf8');
            await client.query(sql);
            console.log('Migration applied successfully!');
        }

        console.log('Reloading PostgREST schema cache...');
        await client.query('NOTIFY pgrst, \'reload schema\'');
        console.log('Schema cache reloaded.');

    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await client.end();
    }
}

main();
