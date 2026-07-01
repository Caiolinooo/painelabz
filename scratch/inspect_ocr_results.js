const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const colabId = '9af7dceb-f7f7-43d9-81e1-87806307739f';

  const { data: docs, error: docErr } = await supabase
    .from('gt_documentos')
    .select('*')
    .eq('colaborador_id', colabId)
    .order('created_at', { ascending: false });

  if (docErr) {
    console.error("Error:", docErr);
    return;
  }

  for (const doc of docs) {
    console.log(`\nDocument ID: ${doc.id}`);
    console.log(`Titulo: ${doc.titulo}`);
    console.log(`ocr_status: ${doc.ocr_status}`);
    
    // Fetch corresponding ASO data
    const { data: aso } = await supabase
      .from('gt_documentos_aso')
      .select('*')
      .eq('documento_id', doc.id)
      .maybeSingle();

    if (aso) {
      console.log("=== ASO in DB ===");
      console.log("medico_pcmso_nome:", aso.medico_pcmso_nome);
      console.log("medico_pcmso_crm:", aso.medico_pcmso_crm);
      console.log("medico_pcmso_uf:", aso.medico_pcmso_uf);
      console.log("medico_nome:", aso.medico_nome);
      console.log("medico_crm:", aso.medico_crm);
      console.log("medico_uf:", aso.medico_uf);
    }

    if (doc.ocr_texto) {
      console.log("\n=== First 600 chars of ocr_texto ===");
      console.log(doc.ocr_texto.substring(0, 600));
      console.log("====================================");
    }
  }
}

run();
