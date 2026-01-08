const axios = require('axios');

const URL = 'https://mio.app.br/api/v1/authenticate';
const CREDENTIALS = {
    user: 'apiabz',
    pass: 'Abz@2025'
};

async function testAuth() {
    console.log('🕵️ Testando autenticação MIO em:', URL);

    const payloads = [
        { name: 'JSON (username)', data: { username: CREDENTIALS.user, password: CREDENTIALS.pass } },
        { name: 'JSON (user)', data: { user: CREDENTIALS.user, password: CREDENTIALS.pass } },
        { name: 'JSON (login)', data: { login: CREDENTIALS.user, password: CREDENTIALS.pass } },
        { name: 'JSON (email)', data: { email: CREDENTIALS.user, password: CREDENTIALS.pass } },
        // Tentando enviar tudo junto
        { name: 'JSON (All)', data: { username: CREDENTIALS.user, user: CREDENTIALS.user, login: CREDENTIALS.user, email: CREDENTIALS.user, password: CREDENTIALS.pass } }
    ];

    for (const p of payloads) {
        try {
            console.log(`\nTesting: ${p.name}`);
            const res = await axios.post(URL, p.data, {
                headers: { 'Content-Type': 'application/json' },
                validateStatus: () => true
            });
            console.log(`Status: ${res.status}`);
            console.log('Body:', JSON.stringify(res.data));
        } catch (e) {
            console.log('Error:', e.message);
        }
    }

    // Testar Form URL Encoded
    try {
        console.log('\nTesting: Form URL Encoded');
        const params = new URLSearchParams();
        params.append('username', CREDENTIALS.user);
        params.append('password', CREDENTIALS.pass);

        const res = await axios.post(URL, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            validateStatus: () => true
        });
        console.log(`Status: ${res.status}`);
        console.log('Body:', JSON.stringify(res.data));
    } catch (e) {
        console.log('Error Form:', e.message);
    }
}

testAuth();
