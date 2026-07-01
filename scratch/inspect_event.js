const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = '75c7ee81-210a-417d-ad3c-12e1b126b660';
  
  // 1. Fetch event
  console.log(`--- Fetching event ${eventId} ---`);
  const { data: event, error: eventError } = await supabase
    .from('esocial_eventos')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError) {
    console.error("Error fetching event:", eventError);
    return;
  }
  console.log("Event details:");
  console.log(JSON.stringify(event, null, 2));

  // 2. Fetch collaborator
  if (event.dados_evento && event.dados_evento.colaborador_id) {
    const colabId = event.dados_evento.colaborador_id;
    console.log(`\n--- Fetching collaborator ${colabId} ---`);
    const { data: colab, error: colabError } = await supabase
      .from('gt_colaboradores')
      .select('*, gt_empresas(*)')
      .eq('id', colabId)
      .maybeSingle();

    if (colabError) {
      console.error("Error fetching collaborator:", colabError);
    } else {
      console.log("Collaborator details:");
      console.log(JSON.stringify(colab, null, 2));
    }
  }
}

run();
