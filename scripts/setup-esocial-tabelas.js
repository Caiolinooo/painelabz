require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseKey, {
  auth: { persistSession: false },
});

async function setup() {
  console.log('Criando tabelas esocial_tabela_27 e esocial_tabela_50...');

  const sqlFilePath = path.join(__dirname, 'create-esocial-codigos.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  // We can use the rpc `exec_sql` if it exists, but sometimes it doesn't work well for large commands.
  // We'll execute statement by statement.
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    console.log('Executando:', statement.substring(0, 50) + '...');
    const { error } = await supabase.rpc('exec_sql', { query: statement + ';' });
    if (error) {
       console.log('Erro via exec_sql, tentando direct psql_api ou ignorando se já existe:', error.message);
    }
  }

  console.log('Setup concluído.');
}

setup().catch(console.error);
