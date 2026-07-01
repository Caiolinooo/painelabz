const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = ***REMOVED*** supabaseKey);

async function run() {
  const ids = [
    '88f756bc-1b73-42b6-aa82-c088c6ee75ae',
    '19d3a663-9a7f-4091-a342-bd0b0b63ffda',
    '6e58a1f0-d851-404f-b3ac-9f5e3ac2f55e'
  ];

  const { data: docs } = await supabase
    .from('gt_documentos')
    .select('*')
    .in('id', ids);

  console.log('Documents details:', JSON.stringify(docs, null, 2));

  const { data: asoRecords } = await supabase
    .from('gt_documentos_aso')
    .select('*')
    .in('documento_id', ids);

  console.log('ASO specific details:', JSON.stringify(asoRecords, null, 2));
}

run();
