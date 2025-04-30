/**
 * Script para criar o usuário administrador no Supabase
 * 
 * Este script usa o cliente Supabase para criar o usuário administrador
 * 
 * Certifique-se de que as variáveis de ambiente estão configuradas:
 * - NEXT_PUBLIC_SUPABASE_URL: URL do projeto Supabase
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Chave anônima do Supabase
 * - ADMIN_EMAIL: Email do administrador (padrão: caio.correia@groupabz.com)
 * - ADMIN_PHONE_NUMBER: Número de telefone do administrador (padrão: +5522997847289)
 * - ADMIN_PASSWORD: Senha do administrador (padrão: Caio@2122@)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Caio@2122@';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Caio';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'Correia';

// Verificar se as variáveis de ambiente estão configuradas
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('SUPABASE_URL ou SUPABASE_ANON_KEY não estão definidos. Configure as variáveis de ambiente.');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para criar o usuário administrador
async function createAdminUser() {
  console.log('Criando usuário administrador...');
  
  try {
    // Primeiro, verificamos se o usuário já existe
    console.log('Verificando se o usuário já existe...');
    
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('*')
      .eq('email', ADMIN_EMAIL)
      .single();
    
    if (!existingUserError && existingUser) {
      console.log('Usuário já existe:', existingUser.id);
      
      // Verificar se o usuário tem permissões
      await addAdminPermissions(existingUser.id);
      
      return existingUser.id;
    }
    
    // Criar o usuário usando a API de autenticação
    console.log('Criando usuário via API de autenticação...');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: {
        data: {
          first_name: ADMIN_FIRST_NAME,
          last_name: ADMIN_LAST_NAME,
          phone_number: ADMIN_PHONE_NUMBER,
          role: 'ADMIN'
        }
      }
    });
    
    if (signUpError) {
      console.error('Erro ao criar usuário:', signUpError);
      return null;
    }
    
    if (!signUpData.user) {
      console.error('Erro ao criar usuário: nenhum usuário retornado');
      return null;
    }
    
    const userId = signUpData.user.id;
    console.log('Usuário criado com sucesso:', userId);
    
    // Inserir o usuário na tabela users
    console.log('Inserindo usuário na tabela users...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: ADMIN_EMAIL,
        phone_number: ADMIN_PHONE_NUMBER,
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
        role: 'ADMIN',
        position: 'Administrador do Sistema',
        department: 'TI',
        active: true,
        password_last_changed: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError) {
      console.error('Erro ao inserir usuário na tabela users:', userError);
      return userId;
    }
    
    console.log('Usuário inserido na tabela users:', userData.id);
    
    // Adicionar permissões ao usuário
    await addAdminPermissions(userId);
    
    return userId;
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
    return null;
  }
}

// Função para adicionar permissões de administrador
async function addAdminPermissions(userId) {
  console.log('Adicionando permissões de administrador...');
  
  try {
    // Lista de módulos
    const modules = [
      'dashboard',
      'manual',
      'procedimentos',
      'politicas',
      'calendario',
      'noticias',
      'reembolso',
      'contracheque',
      'ponto',
      'avaliacao',
      'admin'
    ];
    
    // Verificar permissões existentes
    const { data: existingPermissions, error: permissionsError } = await supabase
      .from('user_permissions')
      .select('module')
      .eq('user_id', userId);
    
    if (permissionsError) {
      console.error('Erro ao verificar permissões existentes:', permissionsError);
    }
    
    // Criar um conjunto de módulos existentes
    const existingModules = new Set();
    if (existingPermissions) {
      existingPermissions.forEach(permission => {
        existingModules.add(permission.module);
      });
    }
    
    // Filtrar módulos que não existem
    const modulesToAdd = modules.filter(module => !existingModules.has(module));
    
    if (modulesToAdd.length === 0) {
      console.log('Usuário já tem todas as permissões necessárias.');
      return true;
    }
    
    // Inserir permissões
    const permissionsToInsert = modulesToAdd.map(module => ({
      user_id: userId,
      module,
      feature: null
    }));
    
    const { data, error } = await supabase
      .from('user_permissions')
      .insert(permissionsToInsert)
      .select();
    
    if (error) {
      console.error('Erro ao adicionar permissões:', error);
      return false;
    }
    
    console.log(`${data.length} permissões adicionadas com sucesso!`);
    
    return true;
  } catch (error) {
    console.error('Erro ao adicionar permissões:', error);
    return false;
  }
}

// Função principal
async function main() {
  console.log('Iniciando criação do usuário administrador...');
  
  const userId = await createAdminUser();
  
  if (userId) {
    console.log('Usuário administrador criado com sucesso!');
  } else {
    console.error('Falha ao criar usuário administrador.');
    process.exit(1);
  }
}

// Executar a função principal
main();
