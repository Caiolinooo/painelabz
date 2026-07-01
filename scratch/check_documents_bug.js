const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's get the list of all colaboradores
  const { data: colaboradores, error: colabError } = await supabase
    .from('gt_colaboradores')
    .select('id, nome_completo, cpf');
  
  if (colabError) {
    console.error('Error fetching colaboradores:', colabError);
    return;
  }

  console.log(`Found ${colaboradores.length} colaboradores`);

  // Let's get all ASO documents
  const { data: docs, error: docError } = await supabase
    .from('gt_documentos')
    .select('id, colaborador_id, titulo, tipo_documento, arquivo_url')
    .eq('tipo_documento', 'aso');

  if (docError) {
    console.error('Error fetching documents:', docError);
    return;
  }

  console.log(`Found ${docs.length} ASO documents`);

  docs.forEach(doc => {
    const colab = colaboradores.find(c => c.id === doc.colaborador_id);
    console.log(`Doc ID: ${doc.id}
    Colaborador ID in Doc: ${doc.colaborador_id} (${colab ? colab.nome_completo : 'NOT FOUND'})
    Title: ${doc.titulo}
    URL: ${doc.arquivo_url}
    `);
  });
}

run();
