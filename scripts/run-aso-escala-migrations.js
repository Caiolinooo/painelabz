/**
 * Aplica migrations ASO identity gate + tipos evento escala no Postgres (Supabase).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const FILES = [
  '20260723_000001_aso_identity_gate.sql',
  '20260723_000002_gt_tipos_evento_escala.sql',
];

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error('DATABASE_URL / SUPABASE_DB_URL não definido');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected.\n');

  try {
    for (const file of FILES) {
      const filePath = path.join(__dirname, '..', 'supabase', 'migrations', file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`>>> Executing ${file} ...`);
      await client.query(sql);
      console.log(`<<< OK ${file}\n`);
    }

    // Verifications
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gt_documentos_aso'
        AND column_name IN ('cpf_documento', 'identity_match')
      ORDER BY column_name
    `);
    console.log(
      'gt_documentos_aso columns:',
      cols.rows.map((r) => r.column_name).join(', ') || '(missing)'
    );

    const tipos = await client.query(
      `SELECT codigo, display_code, label FROM gt_tipos_evento_escala ORDER BY ordem`
    );
    console.log(`gt_tipos_evento_escala rows: ${tipos.rows.length}`);
    for (const row of tipos.rows) {
      console.log(`  - ${row.codigo} (${row.display_code}) ${row.label}`);
    }

    const nullable = await client.query(`
      SELECT is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gt_documentos'
        AND column_name = 'colaborador_id'
    `);
    console.log(
      'gt_documentos.colaborador_id nullable:',
      nullable.rows[0]?.is_nullable || '?'
    );

    console.log('\nMigrations applied successfully.');
  } catch (error) {
    console.error('Migration error:', error.message);
    if (error.position) console.error('position:', error.position);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
