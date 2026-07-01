const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = '75c7ee81-210a-417d-ad3c-12e1b126b660';
  
  const { data: event, error: eventError } = await supabase
    .from('esocial_eventos')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError) {
    console.error("Error fetching event:", eventError);
    return;
  }

  console.log("=== EVENT DADOS_EVENTO ===");
  console.log(JSON.stringify(event.dados_evento, null, 2));
}

run();
