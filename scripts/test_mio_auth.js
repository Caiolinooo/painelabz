const https = require('https');

const user = "***REMOVED***";
const pass = "Caio@2122@";
const baseUrl = "mio.app.br";
const path = "/api/v1/authenticate";

function request(name, headers, body) {
    return new Promise((resolve) => {
        const options = {
            hostname: baseUrl,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log(`[${name}] Status: ${res.statusCode}`);
                console.log(`[${name}] Body: ${data}`);
                resolve();
            });
        });

        req.on('error', e => {
            console.error(`[${name}] Error:`, e.message);
            resolve();
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log("Starting Auth Tests...");

    // 1. Basic Auth
    const authHash = Buffer.from(`${user}:${pass}`).toString('base64');
    await request("Basic Auth", { 'Authorization': `Basic ${authHash}` });

    // 2. Body: username/password
    await request("Body: username/password", {}, { username: user, password: pass });

    // 3. Body: email/password
    await request("Body: email/password", {}, { email: user, password: pass });

    // 4. Body: user/pass
    await request("Body: user/pass", {}, { user: user, pass: pass });

    // 5. Body: login/senha
    await request("Body: login/senha", {}, { login: user, senha: pass });
}

runTests();
