import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { supabaseAdmin } from '../src/lib/supabase';

async function run() {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'gt_documentos_aso';" });
  if (error) {
    // If rpc exec_sql doesn't exist, use simple select
    const { data: d2, error: e2 } = await supabaseAdmin.from('gt_documentos_aso').select('*').limit(1);
    console.log(Object.keys(d2?.[0] || {}));
  } else {
    console.log(data);
  }
}
run();
