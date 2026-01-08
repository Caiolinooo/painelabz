const https = require('https');

// Configurações
const baseURL = 'mio.app.br';
const path = '/api/v1/authenticate';

// Função auxiliar para requests
function makeRequest(username, password, description) {
    return new Promise((resolve, reject) => {
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        const options = {
            hostname: baseURL,
            path: path,
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Content-Length': 0
            }
        };

        console.log(`\n---------------------------------------------------`);
        console.log(`TESTE: ${description}`);
        console.log(`Credenciais: User='${username}', Pass='${password.substring(0, 3)}***'`);
        console.log(`Header Enviado: Authorization: Basic ${auth.substring(0, 10)}...`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log(`STATUS: ${res.statusCode}`);
                console.log(`RESPOSTA: ${data}`);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`ERRO DE CONEXÃO: ${e.message}`);
            resolve();
        });

        req.end();
    });
}

async function runTests() {
    console.log('Iniciando Diagnóstico de Autenticação MIO...');

    // 1. Teste com as credenciais fornecidas (Alvo)
    await makeRequest('apiabz', 'Abz@2025', 'Credenciais Atuais (apiabz)');

    // 2. Teste com senha propositalmente errada (para ver se a mensagem de erro muda)
    // Se a mensagem for "Usuário não cadastrado", então o user não existe.
    // Se a mensagem for "Senha inválida", então o user existe.
    await makeRequest('apiabz', 'SenhaErrada123', 'apiabz + Senha Incorreta');

    // 3. Teste com usuário certamente inexistente
    await makeRequest('usuario_fantasma_xyz', '123456', 'Usuário Inexistente');

    // 4. Teste com usuário Demo (Insomnia)
    await makeRequest('demo', '', 'Usuário Demo (Sem senha)');

    // 5. Teste com usuário Demo (Senha "demo")
    await makeRequest('demo', 'demo', 'Usuário Demo (Senha "demo")');

    console.log(`\n---------------------------------------------------`);
    console.log('Diagnóstico Finalizado.');
}

runTests();
