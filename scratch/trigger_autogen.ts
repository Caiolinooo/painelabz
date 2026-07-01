import * as dotenv from 'dotenv';
import path from 'path';

// Load environmental variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const { autoGenerateESocialEvents } = await import('../src/services/eSocialAutoService');
  const collaboratorId = '9af7dceb-f7f7-43d9-81e1-87806307739f';
  console.log(`Triggering auto event generation for collaborator: ${collaboratorId}`);
  await autoGenerateESocialEvents(collaboratorId);
  console.log("Auto event generation completed!");
}

run().catch(console.error);
