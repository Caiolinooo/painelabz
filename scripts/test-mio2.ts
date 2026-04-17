import * as fs from 'fs';
import * as path from 'path';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = ***REMOVED*** 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1]] = match[2].trim();
        }
    });
} else {
    // try .env
    const envPath2 = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath2)) {
        const envConfig = fs.readFileSync(envPath2, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                process.env[match[1]] = match[2].trim();
            }
        });
    }
}

import { mioClient } from '../src/lib/mio/client';

async function test() {
    console.log("Connecting to MIO...");
    try {
        const connected = await mioClient.testConnection();
        console.log("Connection:", connected);

        console.log("\nFetching Integrantes...");
        const integrantes = await mioClient.getIntegrantes();
        console.log(`Found ${integrantes.length} integrantes.`);
        const cook = integrantes.find((i: any) => i.cargo && i.cargo.toLowerCase().includes('cook') || i.nome.includes('CHEF'));
        if (cook) {
            console.log("\nSample Cozinheiro:");
            console.log(cook);
        } else if (integrantes.length > 0) {
            console.log("\nSample Integrante:");
            console.log(integrantes[0]);
        }

        console.log("\nFetching Embarques...");
        const embarques = await mioClient.getEmbarques();
        console.log(`Found ${embarques.length} embarques.`);
        if (embarques.length > 0) {
            console.log("\nSample Embarque:");
            console.log(embarques[0]);
        }

    } catch (e) {
        console.error(e);
    }
}

test();
