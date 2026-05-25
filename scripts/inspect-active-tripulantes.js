const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const BASE = 'https://mio.app.br/api/v1';
const USER = (process.env.MIO_AUTH_USER || '').replace(/["']/g, '').trim();
const PASS = (process.env.MIO_AUTH_PASSWORD || '').replace(/["']/g, '').trim();

(async () => {
    const creds = Buffer.from(`${USER}:${PASS}`).toString('base64');
    const { data: auth } = await axios.post(`${BASE}/authenticate`, {}, {
        headers: { 'Authorization': `Basic ${creds}` }
    });
    const h = { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' };
    const { data: r } = await axios.post(`${BASE}/int-integrante-get`, {}, { headers: h });
    const active = r.integrante.filter(i => i.situacao !== 'Desligado');
    console.log('Total active:', active.length);
    if (active.length > 0) {
        console.log('Sample Active:', JSON.stringify(active[0], null, 2));
    }
})().catch(e => console.error(e));
