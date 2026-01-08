const https = require('https');

const userEmail = "caio.correia@groupabz.com";
const userSimple = "caio.correia";
const pass = "Caio@2122@";
const host = "mio.app.br";

function request(name, path, authHeader) {
    return new Promise((resolve) => {
        const options = {
            hostname: host,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log(`[${name}] Path: ${path} | Status: ${res.statusCode}`);
                console.log(`[${name}] Body: ${data}`);
                resolve();
            });
        });

        req.on('error', e => {
            console.error(`[${name}] Error:`, e.message);
            resolve();
        });

        req.end();
    });
}

async function runTests() {
    console.log("Starting Auth Tests Round 2...");

    const authEmail = 'Basic ' + Buffer.from(`${userEmail}:${pass}`).toString('base64');
    const authSimple = 'Basic ' + Buffer.from(`${userSimple}:${pass}`).toString('base64');

    // 1. Basic Auth with Email on /api/v1/authenticate
    await request("Email User", "/api/v1/authenticate", authEmail);

    // 2. Basic Auth with Simple User on /api/v1/authenticate
    await request("Simple User", "/api/v1/authenticate", authSimple);

    // 3. Try /sys/api/v1/authenticate (speculative)
    await request("Sys API", "/sys/api/v1/authenticate", authEmail);

    // 4. Try /api/authenticate (no v1)
    await request("No V1", "/api/authenticate", authEmail);
}

runTests();
