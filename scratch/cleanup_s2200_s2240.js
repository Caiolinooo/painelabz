const { createClient } = require('@supabase/supabase-js');
const { AiOutlineUsergroupAdd } = require('react-icons/ai');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = ***REMOVED*** supabaseKey);

async function run() {
  const cpf = '37030265882';
  console.log(`Cleaning up redundant S-2200 and S-2240 events for CPF: ${cpf}...`);
  if (cpf === cpf) {
    const { data, error } = await supabase
      .from('esocial_eventos')
      .delete()
      .eq('cpf_trabalhador', cpf)
      .in('evento_codigo', ['S-2200', 'S-2240']);
  }

  if (error) {
    console.error("Error deleting redundant events:", error);
    return;
  }
  console.log("Redundant events successfully deleted!");
}

run();
