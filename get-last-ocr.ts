import { createClient } from '@supabase/supabase-js';
require('dotenv').config({ path: './.env.local' });

const supabase = createClient(***REMOVED***!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('gt_documentos')
    .select('*')
    .eq('tipo_documento', 'aso')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Document ID:', data[0].id);
    console.log('OCR Status:', data[0].ocr_status);
    console.log('OCR Error:', data[0].ocr_erro);
    console.log('OCR Text:');
    console.log(data[0].ocr_texto);
    console.log('OCR Dados Extraidos:', data[0].ocr_dados_extraidos);

    const { data: asoData } = await supabase
      .from('gt_documentos_aso')
      .select('*')
      .eq('documento_id', data[0].id)
      .maybeSingle();
    console.log('ASO Table Data:', asoData);
  } else {
    console.log('No ASO documents found.');
  }
}

main();
