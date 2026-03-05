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
        console.log('Connected to PG Database.');

        // Check columns
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'academy_courses';
    `);

        const hasCategory = res.rows.some(r => r.column_name === 'category');

        if (!hasCategory) {
            console.log('Adding "category" column to academy_courses...');
            await client.query(`ALTER TABLE academy_courses ADD COLUMN category VARCHAR(100);`);
            console.log('Column "category" added successfully.');

            console.log('Reloading PostgREST schema cache...');
            await client.query('NOTIFY pgrst, \\\'reload schema\\\''.replace(/\\\'/g, "'"));
            console.log('Schema cache reloaded.');
        } else {
            console.log('Column "category" already exists.');
        }

    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await client.end();
    }
}

main();
