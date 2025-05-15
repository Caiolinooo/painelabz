// Script para obter a chave de serviço correta do Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Criar interface de leitura
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Obter variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Verificando configurações do Supabase:');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'Não definida');

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não estão configuradas corretamente');
  process.exit(1);
}

// Criar cliente Supabase com a chave anônima
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Função para testar a conexão
async function testConnection() {
  try {
    console.log('\nTestando conexão com a chave anônima:');
    const { data: anonData, error: anonError } = await supabaseAnon.from('users').select('count').limit(1);

    if (anonError) {
      console.error('Erro ao conectar com a chave anônima:', anonError);
      process.exit(1);
    } else {
      console.log('Conexão com a chave anônima bem-sucedida!');
      console.log('Dados recebidos:', anonData);
    }

    console.log('\nPara obter a chave de serviço correta:');
    console.log('1. Acesse o painel do Supabase (https://app.supabase.com)');
    console.log('2. Selecione seu projeto');
    console.log('3. Vá para "Settings" > "API"');
    console.log('4. Copie a "service_role key" (NÃO a anon key)');
    console.log('\nA chave deve começar com "ey" e ser um JWT completo, não apenas um prefixo como "sbp_"');

    rl.question('\nDigite a chave de serviço do Supabase: ', async (serviceKey) => {
      if (!serviceKey || serviceKey.length < 100 || !serviceKey.startsWith('ey')) {
        console.error('Chave inválida! A chave deve ser um JWT completo e ter pelo menos 100 caracteres.');
        rl.close();
        return;
      }

      // Criar cliente Supabase com a chave de serviço
      const supabaseService = createClient(supabaseUrl, serviceKey);

      console.log('\nTestando conexão com a chave de serviço:');
      const { data: serviceData, error: serviceError } = await supabaseService.from('users').select('count').limit(1);

      if (serviceError) {
        console.error('Erro ao conectar com a chave de serviço:', serviceError);
        rl.close();
        return;
      } else {
        console.log('Conexão com a chave de serviço bem-sucedida!');
        console.log('Dados recebidos:', serviceData);
      }

      console.log('\nTestando autenticação com a chave de serviço:');
      try {
        const { data: authData, error: authError } = await supabaseService.auth.admin.listUsers();

        if (authError) {
          console.error('Erro ao verificar autenticação:', authError);
        } else {
          console.log('Verificação de autenticação bem-sucedida!');
          console.log('Número de usuários:', authData.users.length);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      }

      console.log('\nTestando acesso à tabela users com a chave de serviço:');
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

      console.log('\nA chave de serviço é válida!');
      console.log('Você deve atualizar o arquivo .env com a seguinte linha:');
      console.log(`SUPABASE_SERVICE_KEY=${serviceKey}`);

      rl.close();
    });
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    rl.close();
  }
}

// Executar o teste
testConnection();
