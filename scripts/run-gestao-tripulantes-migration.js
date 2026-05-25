require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database.\n');

    const filePath = path.join(__dirname, '..', 'supabase', 'migrations', '20260520_000001_create_gestao_tripulantes.sql');
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log('Executing GT migration...\n');
    await client.query(sql);
    console.log('Migration executed successfully!\n');

    // Verify views exist
    for (const view of ['gt_vw_dashboard_resumo', 'gt_vw_colaboradores_completo']) {
      const r = await client.query(`SELECT 1 FROM pg_views WHERE viewname = '${view}' AND schemaname = 'public'`);
      console.log(r.rows.length > 0 ? `  ✅ ${view} created` : `  ❌ ${view} NOT found`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

runMigration();
