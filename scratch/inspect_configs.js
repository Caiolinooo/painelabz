const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = ***REMOVED*** supabaseKey);

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
