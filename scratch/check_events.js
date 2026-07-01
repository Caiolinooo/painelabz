const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = ***REMOVED*** supabaseKey);

async function run() {
  const cpf = '37030265882';
  console.log(`Checking events for CPF: ${cpf}...`);

  const { data: events, error } = await supabase
    .from('esocial_eventos')
    .select('*')
    .eq('cpf_trabalhador', cpf);

  if (error) {
    console.error("Error fetching events:", error);
    return;
  }

  console.log(`Found ${events.length} events:`);
  for (const event of events) {
    console.log(`\n======================================================`);
    console.log(`ID: ${event.id}`);
    console.log(`Event Code: ${event.evento_codigo}`);
    console.log(`Status: ${event.status}`);
    console.log(`Created At: ${event.created_at}`);
    console.log(`Protocolo: ${event.protocolo_envio}`);
    console.log(`Recibo: ${event.recibo_entrega}`);
    console.log(`Erro e-Social:`, event.erro_esocial);
    
    // Fetch logs
    const { data: logs } = await supabase
      .from('esocial_envios_log')
      .select('*')
      .eq('evento_id', event.id)
      .order('created_at', { ascending: false });
      
    if (logs && logs.length > 0) {
      console.log(`Logs (${logs.length}):`);
      for (const log of logs) {
        console.log(`  - [${log.created_at}] Action: ${log.acao}, Success: ${log.sucesso}`);
        if (log.mensagem_erro) console.log(`    Error Message: ${log.mensagem_erro}`);
        if (log.xml_retorno) console.log(`    XML Return: ${log.xml_retorno.substring(0, 300)}...`);
      }
    }
  }
}

run();
