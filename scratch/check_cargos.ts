import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { supabaseAdmin } from '../src/lib/supabase';

async function run() {
  const { data, error } = await supabaseAdmin.from('esocial_tabela_50').select('*').limit(1);
  console.log('esocial_tabela_50:', data);

  const { data: d2 } = await supabaseAdmin.from('usuarios').select('cargo, funcao').limit(1);
  console.log('usuarios:', d2);
}
run();
