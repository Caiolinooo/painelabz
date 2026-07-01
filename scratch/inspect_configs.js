const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: configs, error } = await supabase
    .from('esocial_configuracoes')
    .select('*');

  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Configurations:", JSON.stringify(configs, null, 2));
}

run();
