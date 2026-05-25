import * as fs from 'fs';
import * as path from 'path';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function run() {
    console.log("Starting MIO Employee synchronization test...");
    try {
        const { mioSyncService } = await import('../src/lib/mio/sync');
        const result = await mioSyncService.syncEmployees();
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error running synchronization:", e);
    }
}

run();
