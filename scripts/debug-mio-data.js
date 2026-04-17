const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const BASE = 'https://mio.app.br/api/v1';
const USER = (process.env.MIO_AUTH_USER || '').replace(/["']/g, '').trim();
const PASS = (process.env.MIO_AUTH_PASSWORD || '').replace(/["']/g, '').trim();

(async () => {
    const creds = Buffer.from(`${USER}:${PASS}`).toString('base64');
    const { data: auth } = await axios.post(`${BASE}/authenticate`, {}, {
        headers: { 'Authorization': `Basic ${creds}` }, timeout: 10000
    });
    const h = { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' };

    // 1. Integrantes - show structure
    const r1 = await axios.post(`${BASE}/int-integrante-get`, {}, { headers: h, timeout: 30000, validateStatus: () => true });
    console.log('=== INTEGRANTE STRUCTURE ===');
    console.log('Top keys:', Object.keys(r1.data));
    const list = r1.data.integrante;
    if (Array.isArray(list)) {
        console.log('Count:', list.length);
        if (list[0]) {
            console.log('Fields:', Object.keys(list[0]).join(', '));
            // Show first 3 samples with key fields
            for (let i = 0; i < Math.min(3, list.length); i++) {
                const item = list[i];
                console.log(`\n[${i}]`, ***REMOVED***
                    id: item.id,
                    nome: item.nome || item.nome_completo || item.name,
                    cpf: item.cpf_numero || item.cpf,
                    cargo: item.cargo || item.funcao || item.position,
                    funcao: item.funcao,
                    setor: item.setor,
                    departamento: item.departamento,
                    base: item.base,
                    situacao: item.situacao,
                    embarcacao: item.embarcacao || item.vessel || item.navio,
                    empresa: item.empresa || item.company,
                    regime: item.regime_trabalho
                }, null, 2));
            }
        }
    }

    // 3. Try CNPJ-based endpoints with period
    const cnpj = process.env.MIO_CNPJ;
    const data_inicio = '2026-01-01';
    const data_fim = '2026-12-31';

    console.log('\n=== LGP-REPORTS with period ===');
    const r3 = await axios.post(`${BASE}/lgp-reports`, { 
        cnpj: cnpj,
        periodo_inicio: data_inicio,
        periodo_fim: data_fim
    }, { headers: h, timeout: 20000, validateStatus: () => true });
    
    console.log('Status lgp-reports:', r3.status);
    if (r3.status === 200) {
        console.log('Top keys:', Object.keys(r3.data));
        const list = r3.data.history;
        if (Array.isArray(list) && list.length > 0) {
            console.log('Count:', list.length);
            console.log('Fields[0]:', Object.keys(list[0]).join('\n  '));
            console.log('Sample[0]:', JSON.stringify(list[0], null, 2));
        } else {
             console.log('Body:', JSON.stringify(r3.data).substring(0, 400));
        }
    } else {
         console.log('Body:', JSON.stringify(r3.data).substring(0, 400));
    }
})().catch(e => console.error('FATAL:', e.message));
