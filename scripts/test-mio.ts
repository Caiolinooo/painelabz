import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { mioClient } from '../src/lib/mio/client';

async function test() {
    console.log("Connecting to MIO...");
    try {
        const connected = await mioClient.testConnection();
        console.log("Connection:", connected);

        console.log("Fetching Integrantes...");
        const integrantes = await mioClient.getIntegrantes();
        console.log(`Found ${integrantes.length} integrantes`);
        if (integrantes.length > 0) {
            console.log("Sample integrante:", JSON.stringify(integrantes[0], null, 2));
        }

        console.log("Fetching Embarques (no CPF)...");
        const embarques = await mioClient.getEmbarques();
        console.log(`Found ${embarques.length} embarques`);
        if (embarques.length > 0) {
            console.log("Sample embarque:", JSON.stringify(embarques[0], null, 2));
        }

    } catch (e) {
        console.error(e);
    }
}

test();
