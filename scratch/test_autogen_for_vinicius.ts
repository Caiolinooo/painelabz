import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { autoGenerateESocialEvents } from '../src/services/eSocialAutoService';

async function run() {
  const colabId = '9af7dceb-f7f7-43d9-81e1-87806307739f';
  console.log(`Running autoGenerateESocialEvents for ${colabId}...`);
  await autoGenerateESocialEvents(colabId);
  console.log("Finished execution");
}

run().catch(console.error);
