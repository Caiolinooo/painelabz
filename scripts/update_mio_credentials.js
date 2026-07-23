const fs = require('fs');
const https = require('https');
const path = require('path');

// Hash fornecido pelo usuário
const authHash = 'Y2Fpby5jb3JyZWlhQGdyb3VwYWJ6LmNvbTpDYWlvQDIxMjJA';

// Decodificar Base64
const decoded = Buffer.from(authHash, 'base64').toString('utf8');
const [user, ...passParts] = decoded.split(':');
const password = passParts.join(':'); // Caso senha tenha :

console.log('Credenciais Decodificadas:');
console.log(`User: ${user}`);
console.log(`Pass: ${password}`);

// Atualizar .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = fs.readFileSync(envPath, 'utf8');

// Regex seguro para substituir ou adicionar
function updateEnv(key, value) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}="${value}"`);
    } else {
        envContent += `\n${key}="${value}"`;
    }
}

updateEnv('MIO_AUTH_USER', user);
updateEnv('MIO_AUTH_PASSWORD', password);

fs.writeFileSync(envPath, envContent);
console.log('Arquivo .env.local atualizado com sucesso.');

// Testar Conexão Imediatamente
function testConnection() {
    const options = {
        hostname: 'mio.app.br',
        path: '/api/v1/authenticate',
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authHash}`,
            'Content-Type': 'application/json',
            'Content-Length': 0
        }
    };

    console.log('\n--- Testando Conexão com Novas Credenciais ---');
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log(`Status Code: ${res.statusCode}`);
            console.log(`Body: ${data}`);
        });
    });

    req.on('error', e => console.error(e));
    req.end();
}

testConnection();
