const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = ***REMOVED*** supabaseKey);

async function run() {
  const cpf = '37030265882';
  console.log(`Checking collaborator details for CPF: ${cpf}...`);

  const { data: colabs, error } = await supabase
    .from('gt_colaboradores')
    .select('*, cargo:gt_cargos(*), empresa:gt_empresas(*)')
    .ilike('nome_completo', '%Pereira de Oliveira%');

  if (error) {
    console.error("Error fetching collaborator:", error);
    return;
  }

  if (!colabs || colabs.length === 0) {
    console.log("No collaborator found with name containing Vinicius!");
    return;
  }

  console.log(JSON.stringify(colabs, null, 2));
}

run();
