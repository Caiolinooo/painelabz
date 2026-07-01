const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: cols, error } = await supabase
    .from('gt_colaboradores')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching gt_colaboradores:", error);
  } else {
    console.log("One record from gt_colaboradores:");
    console.log(JSON.stringify(cols[0], null, 2));
  }
}

run();
