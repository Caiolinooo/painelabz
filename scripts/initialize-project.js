/**
 * Script para inicializar o projeto completamente
 * 
 * Este script executa todas as etapas necessárias para garantir que o projeto funcione:
 * 1. Verifica a estrutura do banco de dados
 * 2. Cria as tabelas necessárias se não existirem
 * 3. Cria o usuário administrador
 * 4. Verifica a autenticação
 */

require('dotenv').config();
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para executar um script
function runScript(scriptName) {
  console.log(`Executando script ${scriptName}...`);
  try {
    execSync(`node scripts/${scriptName}.js`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Erro ao executar script ${scriptName}:`, error.message);
    return false;
  }
}

// Função para verificar a conexão com o Supabase
async function checkSupabaseConnection() {
  console.log('Verificando conexão com o Supabase...');
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Erro ao conectar com o Supabase:', error);
      return false;
    }
    
    console.log('Conexão com o Supabase estabelecida com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao conectar com o Supabase:', error);
    return false;
  }
}

// Função principal
async function main() {
  console.log('Iniciando inicialização do projeto...');
  
  // Verificar conexão com o Supabase
  const connected = await checkSupabaseConnection();
  if (!connected) {
    console.error('Falha ao conectar com o Supabase. Verifique as credenciais no arquivo .env');
    process.exit(1);
  }
  
  // Executar scripts na ordem correta
  const scripts = [
    'create-db-structure',
    'create-admin-simple',
    'fix-auth'
  ];
  
  for (const script of scripts) {
    const success = runScript(script);
    if (!success) {
      console.error(`Falha ao executar o script ${script}. Continuando com os próximos scripts...`);
    }
  }
  
  console.log('Inicialização do projeto concluída!');
  console.log('Agora você pode iniciar o projeto com o comando: npm run dev');
}

// Executar a função principal
main();
