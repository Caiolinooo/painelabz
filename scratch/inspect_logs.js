const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = ***REMOVED*** supabaseKey);

async function run() {
  console.log(`--- Fetching all esocial_envios_log entries ---`);
  const { data: logs, error } = await supabase
    .from('esocial_envios_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }
  console.log(`Total log entries: ${logs.length}`);
  console.log(JSON.stringify(logs.map(l => ({
    id: l.id,
    evento_id: l.evento_id,
    acao: l.acao,
    sucesso: l.sucesso,
    status_code: l.status_code,
    mensagem_erro: l.mensagem_erro,
    created_at: l.created_at
  })), null, 2));
}

run();
