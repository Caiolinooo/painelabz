const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log(`--- Searching gt_colaboradores for name 'VINICIUS PEREIRA' ---`);
  const { data: colabs, error: colabErr } = await supabase
    .from('gt_colaboradores')
    .select('*, gt_empresas(*)')
    .ilike('nome_completo', '%VINICIUS PEREIRA%');

  if (colabErr) {
    console.error("Error searching collaborators:", colabErr);
  } else {
    console.log(`Found ${colabs.length} records:`);
    console.log(JSON.stringify(colabs, null, 2));
  }
}

run();
