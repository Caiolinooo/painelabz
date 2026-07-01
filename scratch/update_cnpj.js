const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = ***REMOVED*** supabaseKey);

async function run() {
  const companyId = 'a68f4eed-5c6e-41af-b798-c692d4e93eba';
  const eventId = '75c7ee81-210a-417d-ad3c-12e1b126b660';
  const targetCnpj = '17784306000189';

  console.log(`Updating company ${companyId} CNPJ to ${targetCnpj}...`);
  const { data: companyData, error: companyError } = await supabase
    .from('gt_empresas')
    .update({ cnpj: targetCnpj })
    .eq('id', companyId)
    .select();

  if (companyError) {
    console.error("Error updating company:", companyError);
  } else {
    console.log("Company updated successfully:", companyData);
  }

  console.log(`Updating event ${eventId} cnpj_empregador to ${targetCnpj}...`);
  const { data: eventData, error: eventError } = await supabase
    .from('esocial_eventos')
    .update({ cnpj_empregador: targetCnpj })
    .eq('id', eventId)
    .select();

  if (eventError) {
    console.error("Error updating event:", eventError);
  } else {
    console.log("Event updated successfully:", eventData);
  }
}

run();
