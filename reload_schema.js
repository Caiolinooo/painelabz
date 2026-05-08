require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => client.query("NOTIFY pgrst, 'reload schema';"))
  .then(() => console.log('Schema reloaded'))
  .catch(console.error)
  .finally(() => client.end());
