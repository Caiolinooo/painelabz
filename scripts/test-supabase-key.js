// Script para testar a chave de serviço do Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Obter variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Verificando configurações do Supabase:');
console.log('URL:', supabaseUrl);
console.log('Service Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 10)}...${supabaseServiceKey.substring(supabaseServiceKey.length - 10)}` : 'Não definida');
console.log('Comprimento da chave de serviço:', supabaseServiceKey ? supabaseServiceKey.length : 0);

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não estão configuradas corretamente');
  process.exit(1);
}

// Criar cliente Supabase com a chave de serviço
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para testar a conexão
async function testConnection() {
  try {
    console.log('\nTestando conexão com a chave de serviço:');
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
      console.error('Erro ao conectar com a chave de serviço:', error);
    } else {
      console.log('Conexão com a chave de serviço bem-sucedida!');
      console.log('Dados recebidos:', data);
    }
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
  }
}

// Executar o teste
testConnection();
