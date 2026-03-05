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

        // Check columns
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'academy_courses';
    `);

        console.log('Columns:');
        res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();
