const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: events, error } = await supabase
    .from('esocial_eventos')
    .select('*')
    .eq('evento_codigo', 'S-2220');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${events.length} S-2220 events:`);
  events.forEach(e => {
    console.log(`Event ID: ${e.id}
    CPF: ${e.cpf_trabalhador}
    Status: ${e.status}
    Origem ID: ${e.entidade_origem_id}
    Origem Tipo: ${e.entidade_origem_tipo}
    Data Realizacao: ${e.dados_evento?.exameOcupacional?.aso?.dtAso || e.dados_evento?.data_realizacao}
    Result: ${e.dados_evento?.exameOcupacional?.aso?.resAso || e.dados_evento?.resultado}
    `);
  });
}

run();
