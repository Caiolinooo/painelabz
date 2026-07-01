const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const BASE = 'https://mio.app.br/api/v1';
const USER = (process.env.MIO_AUTH_USER || '').replace(/["']/g, '').trim();
const PASS = (process.env.MIO_AUTH_PASSWORD || '').replace(/["']/g, '').trim();

if (!USER || !PASS) {
  console.error('MIO credentials not found in env');
  process.exit(1);
}

const ENDPOINTS = [
  '/sms-aso-get',
  '/sms-aso-get/all',
  '/sms-aso-registro-get',
  '/sms-aso-registro-get/all',
  '/sms-aso-registro-get/12345678909',
  '/sms-exames-get',
  '/sms-exames-registro-get',
  '/sms-exame-registro-get',
  '/int-aso-get',
  '/sms-atestado-get',
  '/sms-atestado-registro-get',
  '/sms-saude-get',
  '/sms-saude-registro-get'
];

async function run() {
  console.log('Authenticating with MIO...');
  const creds = Buffer.from(`${USER}:${PASS}`).toString('base64');
  const { data: auth } = await axios.post(`${BASE}/authenticate`, {}, {
    headers: { 'Authorization': `Basic ${creds}` }
  });
  const headers = { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' };

  console.log('Testing ASO candidate endpoints...');
  for (const endpoint of ENDPOINTS) {
    try {
      const url = `${BASE}${endpoint}`;
      // Test GET
      const resGet = await axios.get(url, { headers, timeout: 5000, validateStatus: () => true });
      console.log(`GET ${endpoint} -> Status: ${resGet.status} | Length: ${JSON.stringify(resGet.data).length}`);
      if (resGet.status === 200) {
        console.log(`   SUCCESS GET ${endpoint}:`, JSON.stringify(resGet.data).substring(0, 200));
      }

      // Test POST
      const resPost = await axios.post(url, {}, { headers, timeout: 5000, validateStatus: () => true });
      console.log(`POST ${endpoint} -> Status: ${resPost.status} | Length: ${JSON.stringify(resPost.data).length}`);
      if (resPost.status === 200) {
        console.log(`   SUCCESS POST ${endpoint}:`, JSON.stringify(resPost.data).substring(0, 200));
      }
    } catch (e) {
      console.log(`Error testing ${endpoint}: ${e.message}`);
    }
  }
}

run();
