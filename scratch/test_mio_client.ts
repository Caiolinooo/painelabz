// Since Next.js uses path mapping, we can write a simple ts file or js file to import it.
// Let's use ts-node to run a typescript script importing mioClient
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { mioClient } from '../src/lib/mio/client';

async function run() {
  console.log('Testing MIO Client...');
  try {
    const ints = await mioClient.getIntegrantes();
    console.log(`Successfully fetched ${ints.length} integrantes`);
    if (ints.length > 0) {
      console.log('Sample integrante:', ints[0]);
    }
  } catch (err) {
    console.error('Error fetching integrantes:', err);
  }

  try {
    const reports = await mioClient.getLGPReportsRaw();
    console.log(`Successfully fetched ${reports.length} LGP reports`);
    if (reports.length > 0) {
      console.log('Sample report:', reports[0]);
    }
  } catch (err) {
    console.error('Error fetching LGP reports:', err);
  }
}

run();
