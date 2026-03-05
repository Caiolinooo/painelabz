require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('Missing DATABASE_URL in .env.local');
        process.exit(1);
    }

    const client = new Client({ connectionString });

    try {
        await client.connect();

        console.log('Adding "stats" column to academy_courses...');
        await client.query(`ALTER TABLE academy_courses ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}'::jsonb;`);
        console.log('Column "stats" added successfully.');

        console.log('Reloading PostgREST schema cache...');
        await client.query('NOTIFY pgrst, \\\'reload schema\\\''.replace(/\\\'/g, "'"));
        console.log('Schema cache reloaded.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();
