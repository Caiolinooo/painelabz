/**
 * Script para criar o usuário administrador no Supabase
 * 
 * Este script usa a API REST do Supabase diretamente para criar o usuário administrador
 * 
 * Certifique-se de que as variáveis de ambiente estão configuradas:
 * - NEXT_PUBLIC_SUPABASE_URL: URL do projeto Supabase
 * - SUPABASE_SERVICE_KEY: Chave de serviço do Supabase
 * - ADMIN_EMAIL: Email do administrador (padrão: caio.correia@groupabz.com)
 * - ADMIN_PHONE_NUMBER: Número de telefone do administrador (padrão: +5522997847289)
 * - ADMIN_PASSWORD: Senha do administrador (padrão: Caio@2122@)
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Caio@2122@';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Caio';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'Correia';

// Verificar se as variáveis de ambiente estão configuradas
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL ou SUPABASE_KEY não estão definidos. Configure as variáveis de ambiente.');
  process.exit(1);
}

// Função para criar o usuário administrador
async function createAdminUser() {
  console.log('Criando usuário administrador...');
  
  try {
    // Primeiro, verificamos se o usuário já existe
    console.log('Verificando se o usuário já existe...');
    
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(ADMIN_EMAIL)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    const existingUsers = await checkResponse.json();
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('Usuário já existe:', existingUsers[0].id);
      return existingUsers[0].id;
    }
    
    // Criar o usuário usando a API de autenticação
    console.log('Criando usuário via API de autenticação...');
    
    const signUpResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        data: {
          first_name: ADMIN_FIRST_NAME,
          last_name: ADMIN_LAST_NAME,
          phone_number: ADMIN_PHONE_NUMBER,
          role: 'ADMIN'
        }
      })
    });
    
    const signUpData = await signUpResponse.json();
    
    if (!signUpResponse.ok) {
      console.error('Erro ao criar usuário:', signUpData.error || signUpData.msg);
      return null;
    }
    
    const userId = signUpData.id || signUpData.user.id;
    console.log('Usuário criado com sucesso:', userId);
    
    // Inserir o usuário na tabela users
    console.log('Inserindo usuário na tabela users...');
    
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
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
    });
    
    if (!insertResponse.ok) {
      const insertError = await insertResponse.json();
      console.error('Erro ao inserir usuário na tabela users:', insertError);
      return userId;
    }
    
    const insertData = await insertResponse.json();
    console.log('Usuário inserido na tabela users:', insertData[0].id);
    
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
    
    // Inserir permissões
    const permissionsToInsert = modules.map(module => ({
      id: uuidv4(),
      user_id: userId,
      module,
      feature: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(permissionsToInsert)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Erro ao adicionar permissões:', error);
      return false;
    }
    
    const data = await response.json();
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
