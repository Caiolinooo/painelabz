// Script para verificar se o Next.js está carregando as variáveis de ambiente corretamente
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Função para verificar as variáveis de ambiente
function checkEnvVariables() {
  console.log('Verificando variáveis de ambiente...');

  // Verificar variáveis do Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Definido' : 'Não definido');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 10)}` : 'Não definido');
  console.log('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 10)}...${supabaseServiceKey.substring(supabaseServiceKey.length - 10)}` : 'Não definido');
  console.log('Comprimento da chave de serviço:', supabaseServiceKey ? supabaseServiceKey.length : 0);

  // Verificar se o Next.js está usando as variáveis de ambiente
  console.log('\nVerificando se o Next.js está usando as variáveis de ambiente...');
  
  // Verificar se o arquivo .env.local existe
  const envLocalPath = path.resolve('.env.local');
  console.log('.env.local existe:', fs.existsSync(envLocalPath) ? 'Sim' : 'Não');
  
  // Verificar se o arquivo .env existe
  const envPath = path.resolve('.env');
  console.log('.env existe:', fs.existsSync(envPath) ? 'Sim' : 'Não');
  
  // Verificar se o Next.js está em execução
  try {
    const nextStatus = execSync('tasklist | findstr "node.exe"', { encoding: 'utf8' });
    console.log('\nProcessos Node.js em execução:');
    console.log(nextStatus);
  } catch (error) {
    console.log('\nNenhum processo Node.js em execução.');
  }

  console.log('\nVerificação concluída.');
}

// Executar a verificação
checkEnvVariables();
