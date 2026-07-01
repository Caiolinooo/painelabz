const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: colabs, error } = await supabase
    .from('gt_colaboradores')
    .select('id, nome_completo, cpf')
    .ilike('nome_completo', '%ADALBERTO%');

  if (error) {
    console.error(error);
    return;
  }

  console.log('Adalberto colaboradores:', colabs);

  for (const c of colabs) {
    const { data: docs } = await supabase
      .from('gt_documentos')
      .select('id, colaborador_id, titulo, tipo_documento, arquivo_url')
      .eq('colaborador_id', c.id);
    
    console.log(`Docs for Adalberto (ID: ${c.id}):`, docs);
  }
}

run();
