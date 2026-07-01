const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = ***REMOVED*** supabaseKey);

async function run() {
  const { data: colaboradores } = await supabase
    .from('gt_colaboradores')
    .select('id, nome_completo, cpf');

  const { data: asos, error } = await supabase
    .from('gt_documentos_aso')
    .select('*');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${asos.length} records in gt_documentos_aso:`);
  asos.forEach(a => {
    const colab = colaboradores.find(c => c.id === a.colaborador_id);
    console.log(`Doc ID: ${a.documento_id}
    Colaborador: ${colab ? colab.nome_completo : 'NOT FOUND'} (${a.colaborador_id})
    Tipo Exame: ${a.tipo_exame}
    Resultado: ${a.resultado}
    Data Realizacao: ${a.data_realizacao}
    esocial_status: ${a.esocial_status}
    `);
  });
}

run();
