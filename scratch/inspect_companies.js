const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: companies, error } = await supabase
    .from('gt_empresas')
    .select('*');

  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Companies:", JSON.stringify(companies, null, 2));
}

run();
