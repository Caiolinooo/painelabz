const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const cpf = '37030265882';
  
  // 1. Search in gt_colaboradores
  console.log(`--- Searching gt_colaboradores for CPF ${cpf} ---`);
  const { data: colabs, error: colabErr } = await supabase
    .from('gt_colaboradores')
    .select('*, gt_empresas(*)')
    .eq('cpf_numero', cpf);

  if (colabErr) {
    console.error("Error searching collaborators:", colabErr);
  } else {
    console.log(`Found ${colabs.length} records:`);
    console.log(JSON.stringify(colabs, null, 2));
  }

  // 2. Search in gt_empresas
  console.log(`\n--- Searching gt_empresas for CNPJ 17784306000189 ---`);
  const { data: empresas, error: empErr } = await supabase
    .from('gt_empresas')
    .select('*')
    .eq('cnpj', '17784306000189');

  if (empErr) {
    console.error("Error searching empresas:", empErr);
  } else {
    console.log(`Found ${empresas.length} companies:`);
    console.log(JSON.stringify(empresas, null, 2));
  }
}

run();
