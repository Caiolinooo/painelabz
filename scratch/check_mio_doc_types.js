const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const BASE = 'https://mio.app.br/api/v1';
const USER = (process.env.MIO_AUTH_USER || '').replace(/["']/g, '').trim();
const PASS = (process.env.MIO_AUTH_PASSWORD || '').replace(/["']/g, '').trim();

async function run() {
  const creds = Buffer.from(`${USER}:${PASS}`).toString('base64');
  const { data: auth } = await axios.post(`${BASE}/authenticate`, {}, {
    headers: { 'Authorization': `Basic ${creds}` }
  });
  const headers = { 'Authorization': `Bearer ${auth.token}` };

  console.log('Fetching all training records from MIO...');
  const { data } = await axios.get(`${BASE}/sms-treinamento-registro-get/all`, { headers });
  
  const list = data.fornecedor || [];
  console.log(`Total records: ${list.length}`);
  
  const docTypes = new Set();
  const asoRecords = [];

  list.forEach(item => {
    const type = item['Tipo de Documento'] || item.tipo_documento || 'Not Specified';
    docTypes.add(type);
    if (type.toLowerCase().includes('aso') || type.toLowerCase().includes('atestado') || type.toLowerCase().includes('saude') || type.toLowerCase().includes('saúde')) {
      asoRecords.push(item);
    }
  });

  console.log('\n=== Document Types Found in MIO: ===');
  console.log(Array.from(docTypes));

  console.log(`\n=== Found ${asoRecords.length} records matching ASO/Atestado/Saúde: ===`);
  if (asoRecords.length > 0) {
    console.log(JSON.stringify(asoRecords.slice(0, 5), null, 2));
  }
}

run().catch(e => console.error(e));
