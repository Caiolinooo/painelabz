const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = ***REMOVED*** supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('esocial_envios_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("--- LATEST LOG ACTION: " + data[0].acao + " ---");
    console.log("Success:", data[0].sucesso);
    console.log("Status Code:", data[0].status_code);
    console.log("Request Body Prefix:");
    console.log(data[0].request_body);
    console.log("\nResponse Body:");
    console.log(data[0].response_body);
  } else {
    console.log("No logs found");
  }
}

run();
