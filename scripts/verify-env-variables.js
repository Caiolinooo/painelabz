// Script para verificar as variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

// Função para verificar as variáveis de ambiente
function verifyEnvVariables() {
  console.log('Verificando variáveis de ambiente...');

  // Verificar variáveis do Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Definido' : 'Não definido');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 10)}` : 'Não definido');
  console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 10)}...${supabaseServiceKey.substring(supabaseServiceKey.length - 10)}` : 'Não definido');
  console.log('Comprimento da chave de serviço:', supabaseServiceKey ? supabaseServiceKey.length : 0);

  // Verificar outras variáveis importantes
  const databaseUrl = process.env.DATABASE_URL;
  console.log('DATABASE_URL:', databaseUrl ? 'Definido' : 'Não definido');

  console.log('\nVerificação concluída.');
}

// Executar a verificação
verifyEnvVariables();
