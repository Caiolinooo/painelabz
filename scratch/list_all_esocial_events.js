const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = ***REMOVED*** supabaseKey);

async function run() {
  console.log("Listing last 15 e-Social events...");

  const { data: events, error } = await supabase
    .from('esocial_eventos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error("Error fetching events:", error);
    return;
  }

  console.log(`Found ${events.length} events:`);
  for (const event of events) {
    console.log(`- ID: ${event.id}, Code: ${event.evento_codigo}, CPF: ${event.cpf_trabalhador}, Status: ${event.status}, Created: ${event.created_at}`);
  }
}

run();
