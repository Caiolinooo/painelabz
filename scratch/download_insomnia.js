const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const BASE = 'https://mio.app.br/api/v1';
const USER = (process.env.MIO_AUTH_USER || '').replace(/["']/g, '').trim();
const PASS = (process.env.MIO_AUTH_PASSWORD || '').replace(/["']/g, '').trim();

if (!USER || !PASS) {
  console.error('MIO credentials not found in env');
  process.exit(1);
}

const PATHS = [
  'https://mio.app.br/api/v1/insomnia.json',
  'https://mio.app.br/api/v1/doc/insomnia.json',
  'https://mio.app.br/api/v1/swagger.json'
];

async function run() {
  console.log('Authenticating with MIO...');
  const creds = Buffer.from(`${USER}:${PASS}`).toString('base64');
  const { data: auth } = await axios.post(`${BASE}/authenticate`, {}, {
    headers: { 'Authorization': `Basic ${creds}` }
  });
  const headers = { 'Authorization': `Bearer ${auth.token}` };

  for (const url of PATHS) {
    try {
      console.log(`Downloading ${url}...`);
      const res = await axios.get(url, { headers, timeout: 10000 });
      console.log(`Status: ${res.status}`);
      if (res.status === 200) {
        const filename = url.split('/').pop();
        require('fs').writeFileSync(`scratch/${filename}`, JSON.stringify(res.data, null, 2));
        console.log(`Saved to scratch/${filename}`);
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

run();
