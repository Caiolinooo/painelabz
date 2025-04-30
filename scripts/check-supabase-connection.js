// Script para verificar a conexão com o Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Obter variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Verificando configurações do Supabase:');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'Não definida');
console.log('Service Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 10)}...` : 'Não definida');

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não estão configuradas corretamente');
  process.exit(1);
}

// Criar cliente Supabase com a chave anônima
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Criar cliente Supabase com a chave de serviço
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Função para testar a conexão
async function testConnection() {
  try {
    console.log('\n1. Testando conexão com a chave anônima:');
    const { data: anonData, error: anonError } = await supabaseAnon.from('users').select('count').limit(1);

    if (anonError) {
      console.error('Erro ao conectar com a chave anônima:', anonError);
    } else {
      console.log('Conexão com a chave anônima bem-sucedida!');
      console.log('Dados recebidos:', anonData);
    }

    console.log('\n2. Testando conexão com a chave de serviço:');
    const { data: serviceData, error: serviceError } = await supabaseService.from('users').select('count').limit(1);

    if (serviceError) {
      console.error('Erro ao conectar com a chave de serviço:', serviceError);
    } else {
      console.log('Conexão com a chave de serviço bem-sucedida!');
      console.log('Dados recebidos:', serviceData);
    }

    console.log('\n3. Testando autenticação com a chave de serviço:');
    const { data: authData, error: authError } = await supabaseService.auth.getUser();

    if (authError) {
      console.error('Erro ao verificar autenticação:', authError);
    } else {
      console.log('Verificação de autenticação bem-sucedida!');
      console.log('Dados do usuário:', authData);
    }

    console.log('\n4. Testando acesso à tabela users com a chave de serviço:');
    const { data: usersData, error: usersError } = await supabaseService
      .from('users')
      .select('*')
      .limit(5);

    if (usersError) {
      console.error('Erro ao acessar tabela users:', usersError);
    } else {
      console.log('Acesso à tabela users bem-sucedido!');
      console.log(`Número de usuários encontrados: ${usersData.length}`);
      if (usersData.length > 0) {
        console.log('Primeiro usuário:', {
          id: usersData[0].id,
          email: usersData[0].email,
          role: usersData[0].role
        });
      }
    }
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
  }
}

// Executar o teste
testConnection();
