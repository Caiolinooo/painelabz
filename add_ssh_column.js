require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  try {
    await client.query("ALTER TABLE ia_server_config ADD COLUMN ssh_settings JSONB DEFAULT '{}'::jsonb;");
    console.log('Column ssh_settings added.');
  } catch (err) {
    if (err.code === '42701') { // column already exists
      console.log('Column ssh_settings already exists.');
    } else {
      console.error(err);
    }
  }
  try {
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Schema reloaded.');
  } catch (err) {
    console.error(err);
  }
  await client.end();
}
run();
