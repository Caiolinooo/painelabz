const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const colabId = '9af7dceb-f7f7-43d9-81e1-87806307739f';
  const eventId = '75c7ee81-210a-417d-ad3c-12e1b126b660';
  const correctMatricula = '17784306000189.000783';

  console.log(`1. Updating collaborator ${colabId} matrícula to ${correctMatricula}...`);
  const { error: colabErr } = await supabase
    .from('gt_colaboradores')
    .update({ matricula: correctMatricula, updated_at: new Date().toISOString() })
    .eq('id', colabId);

  if (colabErr) {
    console.error("Error updating collaborator:", colabErr);
    return;
  }
  console.log("Collaborator matrícula updated.");

  console.log(`2. Updating event ${eventId} matrícula to ${correctMatricula}...`);
  // Also need to update the matricula in dados_evento and clear xml_gerado so it gets regenerated
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
    dadosEspecificos: {
      ...event.dados_evento.dadosEspecificos,
      matricula: correctMatricula
    }
  };

  const { error: eventErr } = await supabase
    .from('esocial_eventos')
    .update({
      matricula: correctMatricula,
      dados_evento: updatedDados,
      xml_gerado: null, // Clear XML so the API route regenerates it automatically on the next send
      status: 'revisao_aprovado', // Reset status so it can be sent
      erros_processamento: null,
      ultimo_erro: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId);

  if (eventErr) {
    console.error("Error updating event:", eventErr);
    return;
  }
  console.log("Event updated and prepared for re-sending.");
}

run();
