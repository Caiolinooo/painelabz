const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const colabId = '9af7dceb-f7f7-43d9-81e1-87806307739f';
  const eventId = 'b5e366fe-2116-408a-8f52-61a19085e373';
  const correctMatricula = '17784306000189.000783';

  console.log(`1. Ensuring collaborator ${colabId} matrícula is set to ${correctMatricula}...`);
  await supabase
    .from('gt_colaboradores')
    .update({ matricula: correctMatricula, updated_at: new Date().toISOString() })
    .eq('id', colabId);

  console.log("Collaborator matrícula checked/updated.");

  console.log(`2. Resetting S-2220 event ${eventId}...`);
  const { data: event, error: fetchErr } = await supabase
    .from('esocial_eventos')
    .select('*')
    .eq('id', eventId)
    .single();

  if (fetchErr) {
    console.error("Error fetching event:", fetchErr);
    return;
  }

  const updatedDados = {
    ...event.dados_evento,
    matricula: correctMatricula,
  };

  const { error: eventErr } = await supabase
    .from('esocial_eventos')
    .update({
      matricula: correctMatricula,
      dados_evento: updatedDados,
      xml_gerado: null,          // Clear cached XML so route.ts regenerates it with tpAmb: 1 (Production)
      status: 'pendente_revisao', // Reset status so it appears in revision dashboard
      erros_processamento: null,
      ultimo_erro: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId);

  if (eventErr) {
    console.error("Error updating event:", eventErr);
    return;
  }
  console.log("S-2220 event reset and ready for re-submission!");
}

run();
