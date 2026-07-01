const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: cacheData, error } = await supabase
    .from('mio_cache')
    .select('tipo, total_registros, atualizado_em');

  if (error) {
    console.error(error);
    return;
  }

  console.log('MIO Cache records:', cacheData);
}

run();
