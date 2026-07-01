const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = 'b5e366fe-2116-408a-8f52-61a19085e373';
  const { data: event, error } = await supabase
    .from('esocial_eventos')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Event details:");
  console.log("Event code:", event.evento_codigo);
  console.log("Status:", event.status);
  console.log("Dados do evento:", JSON.stringify(event.dados_evento, null, 2));
  console.log("XML Gerado:");
  console.log(event.xml_gerado);
}

run();
