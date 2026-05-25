const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const BASE = 'https://mio.app.br/api/v1';
const USER = (process.env.MIO_AUTH_USER || '').replace(/["']/g, '').trim();
const PASS = (process.env.MIO_AUTH_PASSWORD || '').replace(/["']/g, '').trim();

async function check() {
  const creds = Buffer.from(`${USER}:${PASS}`).toString('base64');
  const { data: auth } = await axios.post(`${BASE}/authenticate`, {}, {
    headers: { 'Authorization': `Basic ${creds}` }
  });
  const headers = { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' };

  console.log('Fetching active tripulantes...');
  const { data: rIntegrantes } = await axios.post(`${BASE}/int-integrante-get`, {}, { headers });
  
  console.log("Total in MIO response:", rIntegrantes.integrante.length);
  
  const searchCpf = '37030265882';
  const foundByCpf = rIntegrantes.integrante.filter(i => {
     const cpf = i.cpf_numero ? i.cpf_numero.replace(/\D/g, '') : '';
     return cpf === searchCpf;
  });
  console.log("Found by CPF:", foundByCpf);

  const foundByName = rIntegrantes.integrante.filter(i => {
     return i.nome_completo && i.nome_completo.includes("VINICIUS PEREIRA");
  });
  console.log("Found by Name:", foundByName);
}

check().catch(console.error);
