const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = ***REMOVED*** supabaseKey);

const BASE = 'https://mio.app.br/api/v1';
const USER = (process.env.MIO_AUTH_USER || '').replace(/["']/g, '').trim();
const PASS = (process.env.MIO_AUTH_PASSWORD || '').replace(/["']/g, '').trim();

async function run() {
  console.log('Fetching auth token from MIO...');
  const creds = Buffer.from(`${USER}:${PASS}`).toString('base64');
  const { data: auth } = await axios.post(`${BASE}/authenticate`, {}, {
    headers: { 'Authorization': `Basic ${creds}` }
  });
  const headers = { 'Authorization': `Bearer ${auth.token}` };

  console.log('Fetching data from MIO APIs...');
  
  const [integrantesRes, treinamentosRes, embarquesRes, lgpRes] = await Promise.all([
    axios.get(`${BASE}/int-integrante-get/all`, { headers }).catch(e => { console.error('Error fetching integrantes:', e.message); return { data: { integrantes: [] } }; }),
    axios.get(`${BASE}/sms-treinamento-registro-get/all`, { headers }).catch(e => { console.error('Error fetching treinamentos:', e.message); return { data: { fornecedor: [] } }; }),
    axios.post(`${BASE}/lgp-reports`, { tipo: 'embarques', periodo_inicio: '2025-01-01', periodo_fim: '2027-12-31' }, { headers }).catch(e => { console.error('Error fetching embarques:', e.message); return { data: { history: [] } }; }),
    axios.post(`${BASE}/lgp-reports`, { tipo: 'man_schedules' }, { headers }).catch(e => { console.error('Error fetching LGP reports:', e.message); return { data: { history: [] } }; }),
  ]);

  const integrantes = integrantesRes.data?.integrantes || integrantesRes.data || [];
  const treinamentos = treinamentosRes.data?.fornecedor || treinamentosRes.data || [];
  const embarques = embarquesRes.data?.history || [];
  const lgpReports = lgpRes.data?.history || [];

  console.log(`Fetched:
  - Integrantes: ${integrantes.length}
  - Treinamentos: ${treinamentos.length}
  - Embarques: ${embarques.length}
  - LGP Reports (man_schedules): ${lgpReports.length}
  `);

  const now = new Date().toISOString();
  const entries = [
    { tipo: 'integrantes', dados: integrantes, total_registros: integrantes.length, atualizado_em: now },
    { tipo: 'treinamentos', dados: treinamentos, total_registros: treinamentos.length, atualizado_em: now },
    { tipo: 'embarques', dados: embarques, total_registros: embarques.length, atualizado_em: now },
    { tipo: 'lgp_reports', dados: lgpReports, total_registros: lgpReports.length, atualizado_em: now },
  ];

  for (const entry of entries) {
    console.log(`Upserting ${entry.tipo} into mio_cache...`);
    const { error } = await supabase
      .from('mio_cache')
      .upsert({
        tipo: entry.tipo,
        dados: entry.dados,
        total_registros: entry.total_registros,
        atualizado_em: entry.atualizado_em
      }, { onConflict: 'tipo' });

    if (error) {
      console.error(`Error upserting ${entry.tipo}:`, error.message);
    } else {
      console.log(`Successfully upserted ${entry.tipo}`);
    }
  }

  // Set global meta
  await supabase
    .from('mio_cache')
    .upsert({ tipo: '__meta__', dados: { ultima_execucao: now }, total_registros: 0, atualizado_em: now }, { onConflict: 'tipo' });

  console.log('MIO Cache populated successfully.');
}

run().catch(e => console.error('Fatal error:', e));
