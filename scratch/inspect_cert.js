const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: certs, error } = await supabase
    .from('esocial_certificados')
    .select('*');

  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Certificates:", JSON.stringify(certs.map(c => ({
    id: c.id,
    nome: c.nome,
    cnpj: c.cnpj,
    ativo: c.ativo,
    validade: c.validade,
    created_at: c.created_at
  })), null, 2));
}

run();
