/**
 * Script para garantir que o usuário administrador exista no Supabase
 *
 * Este script deve ser executado com Node.js:
 * node scripts/ensure-admin-user.js
 *
 * Certifique-se de que as variáveis de ambiente estão configuradas:
 * - NEXT_PUBLIC_SUPABASE_URL: URL do projeto Supabase
 * - SUPABASE_SERVICE_KEY: Chave de serviço do Supabase (não a chave anônima)
 * - ADMIN_EMAIL: Email do administrador (padrão: caio.correia@groupabz.com)
 * - ADMIN_PHONE_NUMBER: Número de telefone do administrador (padrão: +5522997847289)
 * - ADMIN_PASSWORD: Senha do administrador (padrão: Caio@2122@)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Caio@2122@';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Caio';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'Correia';

// Verificar se as variáveis de ambiente estão configuradas
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL ou SUPABASE_SERVICE_KEY não estão definidos. Configure as variáveis de ambiente.');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Função para garantir que o usuário administrador exista
async function ensureAdminUser() {
  console.log('Verificando se o usuário administrador existe...');

  try {
    // Verificar se o usuário já existe na tabela users_unified
    console.log('Verificando se o usuário existe na tabela users_unified...');
    const { data: existingUserData, error: existingUserError } = await supabase
      .from('users_unified')
      .select('*')
      .eq('email', ADMIN_EMAIL)
      .single();

    let existingUser = null;

    if (!existingUserError && existingUserData) {
      console.log('Usuário encontrado na tabela users_unified:', existingUserData.id);
      existingUser = {
        id: existingUserData.id,
        email: existingUserData.email
      };
    } else {
      console.log('Usuário não encontrado na tabela users_unified, verificando por telefone...');

      // Tentar encontrar por telefone
      const { data: userByPhone, error: phoneError } = await supabase
        .from('users_unified')
        .select('*')
        .eq('phone_number', ADMIN_PHONE_NUMBER)
        .single();

      if (!phoneError && userByPhone) {
        console.log('Usuário encontrado pelo telefone:', userByPhone.id);
        existingUser = {
          id: userByPhone.id,
          email: userByPhone.email
        };
      }
    }

    if (existingUser) {
      console.log('Usuário administrador já existe na autenticação:', existingUser.id);

      // Verificar se o usuário existe na tabela users_unified
      const { data: userData, error: userError } = await supabase
        .from('users_unified')
        .select('*')
        .eq('id', existingUser.id)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Erro ao verificar usuário na tabela users_unified:', userError);

        // Criar o usuário na tabela users_unified se não existir
        console.log('Criando usuário na tabela users_unified...');
        const { data: newUserData, error: newUserError } = await supabase
          .from('users_unified')
          .insert({
            id: existingUser.id,
            email: ADMIN_EMAIL,
            phone_number: ADMIN_PHONE_NUMBER,
            first_name: ADMIN_FIRST_NAME,
            last_name: ADMIN_LAST_NAME,
            role: 'ADMIN',
            position: 'Administrador do Sistema',
            department: 'TI',
            active: true,
            password_last_changed: new Date().toISOString(),
          })
          .select()
          .single();

        if (newUserError) {
          console.error('Erro ao criar usuário na tabela users_unified:', newUserError);
          return false;
        }

        console.log('Usuário criado na tabela users_unified:', newUserData.id);
      } else if (userData) {
        console.log('Usuário já existe na tabela users_unified:', userData.id);

        // Atualizar os dados do usuário para garantir que estão corretos
        const { data: updatedUserData, error: updateError } = await supabase
          .from('users_unified')
          .update({
            email: ADMIN_EMAIL,
            phone_number: ADMIN_PHONE_NUMBER,
            first_name: ADMIN_FIRST_NAME,
            last_name: ADMIN_LAST_NAME,
            role: 'ADMIN',
            position: 'Administrador do Sistema',
            department: 'TI',
            active: true,
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) {
          console.error('Erro ao atualizar usuário na tabela users_unified:', updateError);
          return false;
        }

        console.log('Usuário atualizado na tabela users_unified:', updatedUserData.id);
      }

      // Verificar se o usuário tem permissões
      await ensureAdminPermissions(existingUser.id);

      return true;
    }

    // Criar usuário usando o método de signup normal
    console.log('Criando usuário administrador...');
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
      return false;
    }

    if (!signUpData.user) {
      console.error('Erro ao criar usuário: nenhum usuário retornado');
      return false;
    }

    console.log('Usuário criado:', signUpData.user.id);

    // Criar usuário na tabela users_unified
    console.log('Criando usuário na tabela users_unified...');
    const { data: newUserData, error: newUserError } = await supabase
      .from('users_unified')
      .insert({
        id: signUpData.user.id,
        email: ADMIN_EMAIL,
        phone_number: ADMIN_PHONE_NUMBER,
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
        role: 'ADMIN',
        position: 'Administrador do Sistema',
        department: 'TI',
        active: true,
        password_last_changed: new Date().toISOString(),
      })
      .select()
      .single();

    if (newUserError) {
      console.error('Erro ao criar usuário na tabela users_unified:', newUserError);
      return false;
    }

    console.log('Usuário criado na tabela users_unified:', newUserData.id);

    // Adicionar permissões ao usuário
    await ensureAdminPermissions(signUpData.user.id);

    return true;
  } catch (error) {
    console.error('Erro ao garantir que o usuário administrador exista:', error);
    return false;
  }
}

// Função para garantir que o usuário administrador tenha todas as permissões
async function ensureAdminPermissions(userId) {
  console.log('Verificando permissões do usuário administrador...');

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

    // Verificar se o usuário já tem permissões
    const { data: existingPermissions, error: permissionsError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId);

    if (permissionsError) {
      console.error('Erro ao verificar permissões do usuário:', permissionsError);
      return false;
    }

    // Criar um mapa das permissões existentes
    const existingModules = new Set();
    if (existingPermissions) {
      existingPermissions.forEach(permission => {
        existingModules.add(permission.module);
      });
    }

    // Adicionar permissões que não existem
    const permissionsToAdd = modules.filter(module => !existingModules.has(module))
      .map(module => ({
        user_id: userId,
        module,
        feature: null
      }));

    if (permissionsToAdd.length > 0) {
      console.log(`Adicionando ${permissionsToAdd.length} permissões ao usuário...`);

      const { data: newPermissions, error: newPermissionsError } = await supabase
        .from('user_permissions')
        .insert(permissionsToAdd)
        .select();

      if (newPermissionsError) {
        console.error('Erro ao adicionar permissões ao usuário:', newPermissionsError);
        return false;
      }

      console.log(`${newPermissions.length} permissões adicionadas com sucesso!`);
    } else {
      console.log('Usuário já tem todas as permissões necessárias.');
    }

    return true;
  } catch (error) {
    console.error('Erro ao garantir permissões do usuário administrador:', error);
    return false;
  }
}

// Função principal
async function main() {
  console.log('Iniciando script para garantir que o usuário administrador exista...');

  const success = await ensureAdminUser();

  if (success) {
    console.log('Usuário administrador garantido com sucesso!');
  } else {
    console.error('Falha ao garantir usuário administrador.');
    process.exit(1);
  }
}

// Executar a função principal
main();
