const axios = require('axios');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const BASE = 'https://mio.app.br/api/v1';
const USER = (process.env.MIO_AUTH_USER || '').replace(/["']/g, '').trim();
const PASS = (process.env.MIO_AUTH_PASSWORD || '').replace(/["']/g, '').trim();

async function run() {
  if (!USER || !PASS) {
    console.error('MIO credentials not found in env');
    process.exit(1);
  }

  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await db.connect();
    console.log('Connected to database.');

    // 1. Fetch from MIO
    console.log('Authenticating with MIO...');
    const creds = Buffer.from(`${USER}:${PASS}`).toString('base64');
    const { data: auth } = await axios.post(`${BASE}/authenticate`, {}, {
      headers: { 'Authorization': `Basic ${creds}` }
    });
    const headers = { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' };

    console.log('Fetching all tripulantes from MIO...');
    const { data: rIntegrantes } = await axios.post(`${BASE}/int-integrante-get`, {}, { headers });
    const mioList = rIntegrantes.integrante || [];
    console.log(`MIO returned ${mioList.length} total integrantes.`);

    // Group MIO by status
    const activeMio = mioList.filter(i => i.situacao === 'Ativo');
    const inactiveMio = mioList.filter(i => i.situacao !== 'Ativo');
    console.log(`MIO Active: ${activeMio.length}, Inactive: ${inactiveMio.length}`);

    // 2. Fetch from Portal db
    const { rows: dbColabs } = await db.query('SELECT id, nome_completo, cpf, email, mio_id FROM gt_colaboradores WHERE deleted_at IS NULL');
    const { rows: dbUsers } = await db.query('SELECT id, first_name, last_name, email, tax_id, active, mio_id FROM users_unified');

    console.log(`Database gt_colaboradores count: ${dbColabs.length}`);
    console.log(`Database users_unified count: ${dbUsers.length}`);

    // Map db records by CPF
    const dbColabByCpf = new Map(dbColabs.map(c => [c.cpf ? c.cpf.replace(/\D/g, '') : '', c]));
    const dbUserByCpf = new Map(dbUsers.map(u => [u.tax_id ? u.tax_id.replace(/\D/g, '') : '', u]));

    console.log('\n=== CHECKING ACTIVE MIO EMPLOYEES MISSING IN PORTAL ===');
    let activeMissingInColab = 0;
    let activeMissingInUser = 0;

    activeMio.forEach(i => {
      const cpf = i.cpf_numero ? i.cpf_numero.replace(/\D/g, '') : '';
      if (!cpf) {
        console.log(`Active MIO employee without CPF: ${i.nome_completo || i.nome} (id: ${i.id})`);
        return;
      }

      const colab = dbColabByCpf.get(cpf);
      const user = dbUserByCpf.get(cpf);

      if (!colab) {
        activeMissingInColab++;
        console.log(`Missing in gt_colaboradores: CPF ${cpf} | Name: ${i.nome_completo || i.nome} | Email: ${i.email}`);
      }
      if (!user) {
        activeMissingInUser++;
        console.log(`Missing in users_unified: CPF ${cpf} | Name: ${i.nome_completo || i.nome} | Email: ${i.email}`);
      } else if (!user.active) {
        console.log(`Inactive in users_unified but Active in MIO: CPF ${cpf} | Name: ${i.nome_completo || i.nome} | Status: active=${user.active}`);
      }
    });

    console.log(`\nSummary of active MIO missing in DB:`);
    console.log(`- Missing in gt_colaboradores: ${activeMissingInColab}`);
    console.log(`- Missing in users_unified: ${activeMissingInUser}`);

  } catch (err) {
    console.error('Error during comparison:', err);
  } finally {
    await db.end();
  }
}

run();
