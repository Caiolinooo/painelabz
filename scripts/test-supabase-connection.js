// Script para testar a conexão com o Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Obter variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Criar clientes Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para testar a conexão
async function testConnection() {
  try {
    console.log('Testando conexão com o Supabase...');

    // Testar conexão com a chave anônima
    console.log('\n1. Testando conexão com a chave anônima:');
    const { data: anonData, error: anonError } = await supabase.from('users').select('count').limit(1);

    if (anonError) {
      console.error('Erro ao conectar com a chave anônima:', anonError);
    } else {
      console.log('Conexão com a chave anônima bem-sucedida!');
      console.log('Dados recebidos:', anonData);
    }

    // Testar conexão com a chave de serviço (agora usando a chave anônima)
    console.log('\n2. Testando conexão com o cliente supabaseAdmin:');
    const { data: adminData, error: adminError } = await supabaseAdmin.from('users').select('count').limit(1);

    if (adminError) {
      console.error('Erro ao conectar com o cliente supabaseAdmin:', adminError);
    } else {
      console.log('Conexão com o cliente supabaseAdmin bem-sucedida!');
      console.log('Dados recebidos:', adminData);
    }
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
  }
}

// Executar o teste
testConnection();
