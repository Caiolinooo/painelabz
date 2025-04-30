/**
 * Script para verificar e corrigir a estrutura do banco de dados Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para verificar se uma tabela existe
async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error(`Erro ao verificar tabela ${tableName}:`, error);
      return false;
    }
    
    console.log(`Tabela ${tableName} existe.`);
    return true;
  } catch (error) {
    console.error(`Erro ao verificar tabela ${tableName}:`, error);
    return false;
  }
}

// Função para verificar a estrutura do banco de dados
async function checkDatabaseStructure() {
  console.log('Verificando estrutura do banco de dados...');
  
  // Lista de tabelas que devem existir
  const requiredTables = [
    'users',
    'user_permissions',
    'access_history',
    'invite_codes',
    'password_reset_tokens'
  ];
  
  // Verificar cada tabela
  for (const tableName of requiredTables) {
    const exists = await checkTableExists(tableName);
    if (!exists) {
      console.error(`Tabela ${tableName} não existe!`);
    }
  }
  
  // Verificar se o usuário administrador existe
  const { data: adminUser, error: adminError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'caio.correia@groupabz.com')
    .single();
  
  if (adminError) {
    console.error('Usuário administrador não encontrado:', adminError);
  } else {
    console.log('Usuário administrador encontrado:', adminUser.id);
    
    // Verificar permissões do administrador
    const { data: permissions, error: permissionsError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', adminUser.id);
    
    if (permissionsError) {
      console.error('Erro ao verificar permissões do administrador:', permissionsError);
    } else {
      console.log(`Administrador tem ${permissions.length} permissões.`);
      
      // Verificar se tem permissão de admin
      const hasAdminPermission = permissions.some(p => p.module === 'admin');
      if (!hasAdminPermission) {
        console.error('Administrador não tem permissão de admin!');
      } else {
        console.log('Administrador tem permissão de admin.');
      }
    }
  }
  
  console.log('Verificação da estrutura do banco de dados concluída.');
}

// Função principal
async function main() {
  try {
    await checkDatabaseStructure();
    console.log('Script concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao executar script:', error);
    process.exit(1);
  }
}

// Executar a função principal
main();
