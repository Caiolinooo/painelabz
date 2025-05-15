/**
 * Script simples para criar o usuário administrador no Supabase
 * 
 * Este script usa a API REST do Supabase diretamente para criar o usuário administrador
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_EMAIL = 'caio.correia@groupabz.com';
const ADMIN_PHONE_NUMBER = '+5522997847289';
const ADMIN_PASSWORD = 'Caio@2122@';
const ADMIN_FIRST_NAME = 'Caio';
const ADMIN_LAST_NAME = 'Correia';

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createAdminUser() {
  console.log('Iniciando criação do usuário administrador...');
  
  try {
    // Verificar se o usuário já existe
    console.log('Verificando se o usuário já existe...');
    
    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('*')
      .eq('email', ADMIN_EMAIL);
    
    if (!existingError && existingUsers && existingUsers.length > 0) {
      console.log('Usuário já existe:', existingUsers[0].id);
      
      // Atualizar o usuário para garantir que está ativo e tem o papel de administrador
      const { error: updateError } = await supabase
        .from('users')
        .update({
          active: true,
          role: 'ADMIN',
          first_name: ADMIN_FIRST_NAME,
          last_name: ADMIN_LAST_NAME,
          phone_number: ADMIN_PHONE_NUMBER,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUsers[0].id);
      
      if (updateError) {
        console.error('Erro ao atualizar usuário:', updateError);
      } else {
        console.log('Usuário atualizado com sucesso!');
      }
      
      return existingUsers[0].id;
    }
    
    // Criar o usuário
    console.log('Criando usuário...');
    
    // Primeiro, criar o usuário na autenticação
    const { data: authData, error: authError } = await supabase.auth.signUp({
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
    
    if (authError) {
      console.error('Erro ao criar usuário na autenticação:', authError);
      return null;
    }
    
    if (!authData.user) {
      console.error('Erro ao criar usuário: nenhum usuário retornado');
      return null;
    }
    
    const userId = authData.user.id;
    console.log('Usuário criado na autenticação:', userId);
    
    // Inserir o usuário na tabela users
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
        password_last_changed: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError) {
      console.error('Erro ao inserir usuário na tabela users:', userError);
      return userId;
    }
    
    console.log('Usuário inserido na tabela users:', userData.id);
    
    // Adicionar permissões ao usuário
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
    
    const permissionsToInsert = modules.map(module => ({
      user_id: userId,
      module,
      feature: null
    }));
    
    const { error: permissionsError } = await supabase
      .from('user_permissions')
      .insert(permissionsToInsert);
    
    if (permissionsError) {
      console.error('Erro ao adicionar permissões:', permissionsError);
    } else {
      console.log('Permissões adicionadas com sucesso!');
    }
    
    return userId;
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
    return null;
  }
}

// Função principal
async function main() {
  const userId = await createAdminUser();
  
  if (userId) {
    console.log('Usuário administrador criado/atualizado com sucesso!');
  } else {
    console.error('Falha ao criar usuário administrador.');
    process.exit(1);
  }
}

// Executar a função principal
main();
