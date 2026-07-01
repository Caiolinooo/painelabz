import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { autoGenerateESocialEvents } from '../src/services/eSocialAutoService';
import { supabaseAdmin } from '../src/lib/supabase';

async function run() {
  const cpf = '37030265882';
  const colabId = '9af7dceb-f7f7-43d9-81e1-87806307739f';

  console.log(`1. Deleting S-2200 and S-2240 events for CPF ${cpf}...`);
  const { error: deleteErr } = await supabaseAdmin
    .from('esocial_eventos')
    .delete()
    .eq('cpf_trabalhador', cpf)
    .in('evento_codigo', ['S-2200', 'S-2240']);

  if (deleteErr) {
    console.error("Error deleting events:", deleteErr);
    return;
  }
  console.log("Deleted old S-2200 and S-2240 events.");

  console.log(`2. Triggering auto-generation for collaborator ${colabId}...`);
  await autoGenerateESocialEvents(colabId);
  console.log("Finished regeneration.");
}

run().catch(console.error);
