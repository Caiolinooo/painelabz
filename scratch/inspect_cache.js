const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = ***REMOVED*** supabaseKey);

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
