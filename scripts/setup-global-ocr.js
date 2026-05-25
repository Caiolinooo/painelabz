require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function setup() {
  console.log('Configurando OCR global...');

  // Try exec_sql RPC first
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260522_000002_create_global_ocr_config.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  let execError = null;
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    execError = error;
  } catch {
    execError = { message: 'exec_sql not available' };
  }

  if (execError) {
    console.log('exec_sql não disponível, inserindo diretamente na tabela settings...');
    const { error: insertError } = await supabase
      .from('settings')
      .upsert({
        key: 'ocr',
        value: {
          qualidade: 'normal',
          automatico_upload: true,
          fallback_api_url: '',
          fallback_api_key: '',
          idioma: 'por',
        },
        description: 'Configuração global do módulo OCR. Suporta fallback para API externa, idioma do Tesseract, e qualidade de processamento.',
      }, { onConflict: 'key', ignoreDuplicates: true });

    if (insertError) {
      console.error('Erro ao inserir configuração OCR:', insertError.message);
      process.exit(1);
    }
    console.log('Configuração OCR inserida com sucesso!');
  } else {
    console.log('Migration executada com sucesso!');
  }

  const { data: existing } = await supabase
    .from('settings')
    .select('*')
    .eq('key', 'ocr')
    .maybeSingle();

  if (existing) {
    console.log('\nConfiguração atual:', JSON.stringify(existing.value, null, 2));
  } else {
    console.log('\nConfiguração OCR não encontrada (pode já existir com ON CONFLICT DO NOTHING).');
  }

  console.log('\nOCR global configurado! Use a API:');
  console.log('  POST /api/ocr/extract  (upload file + tipo_documento)');
  console.log('  POST /api/ocr/document/[id]/process  (process stored document)');
}

setup().catch(console.error);
