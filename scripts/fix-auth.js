/**
 * Script para corrigir problemas de autenticação no Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_EMAIL = 'caio.correia@groupabz.com';
const ADMIN_PASSWORD = 'Caio@2122@';

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para verificar e corrigir a autenticação
async function fixAuthentication() {
  console.log('Verificando autenticação...');

  try {
    // Tentar fazer login com o usuário administrador
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (signInError) {
      console.error('Erro ao fazer login:', signInError);

      // Tentar criar o usuário
      console.log('Tentando criar o usuário administrador...');

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        options: {
          data: {
            first_name: 'Caio',
            last_name: 'Correia',
            phone_number: '+5522997847289',
            role: 'ADMIN'
          }
        }
      });

      if (signUpError) {
        console.error('Erro ao criar usuário:', signUpError);
        return false;
      }

      console.log('Usuário criado com sucesso:', signUpData.user?.id);
      return true;
    }

    console.log('Login realizado com sucesso:', signInData.user?.id);

    // Verificar se o usuário existe na tabela users_unified
    const { data: userData, error: userError } = await supabase
      .from('users_unified')
      .select('*')
      .eq('email', ADMIN_EMAIL)
      .single();

    if (userError) {
      console.error('Erro ao buscar usuário na tabela users_unified:', userError);

      // Tentar inserir o usuário na tabela users_unified
      console.log('Tentando inserir o usuário na tabela users_unified...');

      const { data: insertData, error: insertError } = await supabase
        .from('users_unified')
        .insert({
          id: signInData.user.id,
          email: ADMIN_EMAIL,
          phone_number: '+5522997847289',
          first_name: 'Caio',
          last_name: 'Correia',
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

      if (insertError) {
        console.error('Erro ao inserir usuário na tabela users_unified:', insertError);
        return false;
      }

      console.log('Usuário inserido na tabela users_unified:', insertData.id);
    } else {
      console.log('Usuário encontrado na tabela users_unified:', userData.id);
    }

    return true;
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return false;
  }
}

// Função principal
async function main() {
  try {
    const success = await fixAuthentication();

    if (success) {
      console.log('Autenticação corrigida com sucesso!');
    } else {
      console.error('Falha ao corrigir autenticação.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Erro ao executar script:', error);
    process.exit(1);
  }
}

// Executar a função principal
main();
