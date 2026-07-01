const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const docId = '7ce44b7c-de06-40f7-ba8f-dddea780e248';
  
  const { data: doc, error } = await supabase
    .from('gt_documentos')
    .select('ocr_texto')
    .eq('id', docId)
    .single();

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("=== FULL OCR TEXT FOR " + docId + " ===");
  console.log(doc.ocr_texto);
}

run();
