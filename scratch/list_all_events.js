const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = ***REMOVED*** supabaseKey);

async function run() {
  const { data: events, error } = await supabase
    .from('esocial_eventos')
    .select('id, evento_codigo, status, cpf_trabalhador, cnpj_empregador, matricula, protocolo_envio, numero_recibo, ultimo_erro, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log(`Total events found: ${events.length}`);
  console.log(JSON.stringify(events, null, 2));
}

run();
