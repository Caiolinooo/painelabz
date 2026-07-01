const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const cpf = '37030265882';
  console.log(`Checking MIO cache for CPF: ${cpf}...`);

  const { data: cacheRow } = await supabase
    .from('mio_cache')
    .select('data')
    .eq('tipo', 'integrantes')
    .maybeSingle();

  if (!cacheRow || !Array.isArray(cacheRow.data)) {
    console.log("No MIO cache data found!");
    return;
  }

  const mioData = cacheRow.data.find(i => {
    const c = (i.cpf || i.cpf_numero || '').replace(/\D/g, '');
    return c === cpf;
  });

  if (mioData) {
    console.log("Found in MIO cache:");
    console.log(JSON.stringify(mioData, null, 2));
  } else {
    console.log("Not found in MIO cache. Let's list some elements from the cache to see the format:");
    console.log(JSON.stringify(cacheRow.data.slice(0, 5), null, 2));
  }
}

run();
