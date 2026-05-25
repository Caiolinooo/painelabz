require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('Erro: DATABASE_URL deve estar definido no .env.local');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'create-esocial-codigos.sql'), 'utf8');
  try {
    await client.query(sql);
    console.log('SQL executado com sucesso via pg.');
  } catch (err) {
    console.error('Erro ao executar SQL:', err);
  } finally {
    await client.end();
  }
}

run();
