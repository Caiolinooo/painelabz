const axios = require('axios');
const https = require('https');

// Ignorar erros de certificado SSL se houver
const agent = new https.Agent({
    rejectUnauthorized: false
});

const CREDENTIALS = {
    username: process.env.MIO_AUTH_USER || process.argv[2],
    password: process.env.MIO_AUTH_PASSWORD || process.argv[3]
};
if (!CREDENTIALS.username || !CREDENTIALS.password) {
    console.error('Provide MIO credentials via MIO_AUTH_USER/MIO_AUTH_PASSWORD or argv: node discover-mio.js <user> <password>');
    process.exit(1);
}

// Lista de prefixos comuns para APIs
const PREFIXES = [
    '',
    '/api',
    '/sys',
    '/sistema',
    '/app',
    '/service',
    '/ws',
    '/rest',
    '/v1',
    '/api/v1',
    '/backend',
    '/server'
];

// Lista de endpoints conhecidos da doc
const ENDPOINTS = [
    '/int-integrante-get', // O principal
    '/sms-treinamento-registro-get',
    '/api/doc/insomnia.json',
    '/login',
    '/auth/login'
];

// Domínio base
const DOMAIN = 'https://mio.app.br';

async function scan() {
    console.log('🕵️ Iniciando varredura profunda na API MIO...\n');

    for (const prefix of PREFIXES) {
        const baseUrl = `${DOMAIN}${prefix}`;

        for (const endpoint of ENDPOINTS) {
            // Ajustar se o endpoint já começa com /api e estamos testando prefixo /api (evitar /api/api)
            if (prefix.endsWith('/api') && endpoint.startsWith('/api')) continue;

            const url = `${baseUrl}${endpoint}`;

            // Testar ambos GET e POST
            const methods = ['GET', 'POST'];

            for (const method of methods) {
                try {
                    process.stdout.write(`Testing: ${method} ${url} ... `);

                    const response = await axios({
                        method,
                        url,
                        httpsAgent: agent,
                        timeout: 5000,
                        validateStatus: () => true, // Capturar todos os status
                        auth: {
                            username: CREDENTIALS.username,
                            password: CREDENTIALS.password
                        },
                        data: {} // Body vazio para POST
                    });

                    // Analisar resposta
                    const status = response.status;
                    const type = response.headers['content-type'] || '';

                    // Se for 200, 401 ou 403 (mas JSON), é um forte candidato
                    // Se for 404 HTML, é lixo.
                    // Se for 405 (Method Not Allowed), o endpoint existe mas o método está errado (bom sinal!)

                    if (status === 404) {
                        console.log('❌ 404');
                    } else if (status === 200) {
                        console.log(`✅ 200 OK! [Type: ${type}]`);
                        if (type.includes('json') || type.includes('text/plain')) {
                            console.log('   >>> ENCONTRADO CANDIDATO FORTE! <<<');
                            console.log('   Preview:', JSON.stringify(response.data).substring(0, 150));
                            return; // Parar se achar algo promissor
                        }
                    } else if (status === 405) {
                        console.log(`⚠️ 405 Method Not Allowed (Endpoint existe!)`);
                        console.log('   >>> ENCONTRADO PREFIXO VÁLIDO <<<');
                        return;
                    } else if (status === 401 || status === 403) {
                        console.log(`🔐 ${status} Auth Required (Endpoint existe!)`);
                        // Testar se é JSON
                        if (type.includes('json')) {
                            console.log('   >>> ENCONTRADO PREFIXO VÁLIDO (Requer Auth Melhor) <<<');
                            return;
                        }
                    } else if (status >= 500) {
                        console.log(`🔥 ${status} Server Error (Pode ser o endpoint certo quebrando)`);
                    } else {
                        console.log(`ℹ️ ${status}`);
                    }

                } catch (err) {
                    console.log(`ERR: ${err.message}`);
                }
            }
        }
    }
    console.log('\nVarredura concluída. Nenhum endpoint respondeu de forma conclusiva.');
}

scan();
