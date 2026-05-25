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
    
    const cnpj = process.env.MIO_CNPJ;
    const data_inicio = '2026-01-01';
    const data_fim = '2026-12-31';

    const r = await axios.post(`${BASE}/lgp-reports`, { 
        cnpj: cnpj,
        periodo_inicio: data_inicio,
        periodo_fim: data_fim
    }, { headers: h, timeout: 20000 });
    
    const destinations = new Set();
    r.data.history.forEach(item => {
        if (item.Destino) destinations.add(item.Destino);
    });

    console.log('Unique destinations:', Array.from(destinations));
})().catch(e => console.error(e));
