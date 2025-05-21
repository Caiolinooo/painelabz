require('dotenv').config({ path: './.env.local' }); // Load environment variables
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED***; // Use service key for schema access

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: SUPABASE_URL ou ***REMOVED*** não encontrados nos arquivos .env.');
  console.error('Certifique-se de que .env.local ou outro arquivo .env está configurado corretamente com essas variáveis.');
  process.exit(1);
}

// Create a Supabase client with the service role key
const supabase = ***REMOVED*** supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function getSchema() {
  try {
    console.log('Conectando ao Supabase para obter a schema da tabela Reimbursement usando pg_catalog...');
    
    // Query pg_catalog to get column names for the Reimbursement table
    const { data, error } = await supabase
      .from('pg_catalog.pg_attribute')
      .select('attname')
      .eq('attrelid::regclass::text', 'public.Reimbursement')
      .eq('attstattarget', -1) // Filter out system columns if necessary
      .order('attnum');


    if (error) {
      console.error('Erro ao buscar a schema do Supabase usando pg_catalog:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('Tabela \'public.Reimbursement\' não encontrada no pg_catalog ou sem colunas de usuário.');
      console.log('Por favor, verifique o nome da tabela e o schema (public) no seu banco de dados Supabase.');
      process.exit(0);
    }

    console.log('\nSchema da tabela Reimbursement (pg_catalog):');
    console.log('--------------------------------------------');
    data.forEach(col => {
      console.log(`Coluna: ${col.attname}`);
    });
    console.log('--------------------------------------------');

  } catch (error) {
    console.error('Ocorreu um erro:', error);
    process.exit(1);
  }
}

getSchema(); 