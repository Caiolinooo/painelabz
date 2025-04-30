/**
 * Script para garantir que o perfil do administrador existe e está configurado corretamente
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

// Verificar configurações
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Erro: SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase
console.log('Criando cliente Supabase com URL:', SUPABASE_URL);
console.log('Chave de serviço presente:', SUPABASE_SERVICE_KEY ? 'Sim' : 'Não');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function ensureAdminProfile() {
  console.log('Verificando perfil do administrador...');

  try {
    // Buscar o usuário administrador por email
    console.log(`Buscando administrador com email: ${ADMIN_EMAIL}`);
    const { data: adminByEmail, error: emailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', ADMIN_EMAIL)
      .single();

    if (emailError || !adminByEmail) {
      console.log('Administrador não encontrado por email, tentando por telefone...');

      // Buscar o usuário administrador por telefone
      const { data: adminByPhone, error: phoneError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', ADMIN_PHONE_NUMBER)
        .single();

      if (phoneError || !adminByPhone) {
        console.log('Administrador não encontrado, verificando na autenticação...');

        // Tentar criar o usuário administrador diretamente
        console.log('Tentando criar usuário administrador diretamente...');

        // Criar usuário administrador na autenticação
        const { data: newAuthUser, error: signUpError } = await supabase.auth.signUp({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          phone: ADMIN_PHONE_NUMBER,
          options: {
            data: {
              first_name: ADMIN_FIRST_NAME,
              last_name: ADMIN_LAST_NAME,
              role: 'ADMIN'
            }
          }
        });

        let adminAuth = null;

        if (signUpError) {
          console.error('Erro ao criar usuário administrador na autenticação:', signUpError);

          // Tentar fazer login com o usuário administrador
          console.log('Tentando fazer login com o usuário administrador...');

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
          });

          if (signInError) {
            console.error('Erro ao fazer login com o usuário administrador:', signInError);
            return false;
          }

          console.log('Login com o usuário administrador bem-sucedido');

          // Usar o usuário do login
          adminAuth = signInData.user;
        } else {
          console.log('Usuário administrador criado na autenticação:', newAuthUser.user.id);

          // Usar o usuário recém-criado
          adminAuth = newAuthUser.user;
        }

        if (adminAuth) {
          console.log('Administrador encontrado na autenticação, criando perfil...');

          // Criar perfil para o administrador
          const { data: newAdmin, error: createError } = await supabase
            .from('users')
            .insert({
              id: adminAuth.id,
              email: ADMIN_EMAIL,
              phone_number: ADMIN_PHONE_NUMBER,
              first_name: ADMIN_FIRST_NAME,
              last_name: ADMIN_LAST_NAME,
              role: 'ADMIN',
              active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              access_permissions: { modules: { admin: true } }
            })
            .select('*')
            .single();

          if (createError) {
            console.error('Erro ao criar perfil de administrador:', createError);
            return false;
          }

          console.log('Perfil de administrador criado com sucesso:', newAdmin.id);
          return true;
        } else {
          console.log('Administrador não encontrado na autenticação, criando usuário...');

          // Criar usuário administrador na autenticação
          const { data: newAuthUser, error: signUpError } = await supabase.auth.admin.createUser({
            email: ADMIN_EMAIL,
            phone: ADMIN_PHONE_NUMBER,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: {
              first_name: ADMIN_FIRST_NAME,
              last_name: ADMIN_LAST_NAME,
              role: 'ADMIN'
            }
          });

          if (signUpError) {
            console.error('Erro ao criar usuário administrador na autenticação:', signUpError);
            return false;
          }

          console.log('Usuário administrador criado na autenticação:', newAuthUser.user.id);

          // Criar perfil para o novo usuário
          const { data: newAdmin, error: createError } = await supabase
            .from('users')
            .insert({
              id: newAuthUser.user.id,
              email: ADMIN_EMAIL,
              phone_number: ADMIN_PHONE_NUMBER,
              first_name: ADMIN_FIRST_NAME,
              last_name: ADMIN_LAST_NAME,
              role: 'ADMIN',
              active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              access_permissions: { modules: { admin: true } }
            })
            .select('*')
            .single();

          if (createError) {
            console.error('Erro ao criar perfil de administrador:', createError);
            return false;
          }

          console.log('Perfil de administrador criado com sucesso:', newAdmin.id);
          return true;
        }
      } else {
        // Verificar se o usuário encontrado por telefone é administrador
        if (adminByPhone.role !== 'ADMIN') {
          console.log('Usuário encontrado por telefone não é administrador, atualizando...');

          // Atualizar o papel para ADMIN
          const { error: updateError } = await supabase
            .from('users')
            .update({
              role: 'ADMIN',
              access_permissions: { modules: { admin: true } }
            })
            .eq('id', adminByPhone.id);

          if (updateError) {
            console.error('Erro ao atualizar papel do usuário para ADMIN:', updateError);
            return false;
          }

          console.log('Usuário atualizado para administrador com sucesso:', adminByPhone.id);
        } else {
          console.log('Usuário administrador encontrado por telefone:', adminByPhone.id);

          // Verificar se o usuário tem permissões de administrador
          if (!adminByPhone.access_permissions ||
              !adminByPhone.access_permissions.modules ||
              !adminByPhone.access_permissions.modules.admin) {

            console.log('Atualizando permissões de administrador...');

            // Atualizar permissões
            const { error: updateError } = await supabase
              .from('users')
              .update({
                access_permissions: {
                  ...(adminByPhone.access_permissions || {}),
                  modules: {
                    ...(adminByPhone.access_permissions?.modules || {}),
                    admin: true
                  }
                }
              })
              .eq('id', adminByPhone.id);

            if (updateError) {
              console.error('Erro ao atualizar permissões de administrador:', updateError);
              return false;
            }

            console.log('Permissões de administrador atualizadas com sucesso');
          }
        }

        return true;
      }
    } else {
      // Verificar se o usuário encontrado por email é administrador
      if (adminByEmail.role !== 'ADMIN') {
        console.log('Usuário encontrado por email não é administrador, atualizando...');

        // Atualizar o papel para ADMIN
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: 'ADMIN',
            access_permissions: { modules: { admin: true } }
          })
          .eq('id', adminByEmail.id);

        if (updateError) {
          console.error('Erro ao atualizar papel do usuário para ADMIN:', updateError);
          return false;
        }

        console.log('Usuário atualizado para administrador com sucesso:', adminByEmail.id);
      } else {
        console.log('Usuário administrador encontrado por email:', adminByEmail.id);

        // Verificar se o usuário tem permissões de administrador
        if (!adminByEmail.access_permissions ||
            !adminByEmail.access_permissions.modules ||
            !adminByEmail.access_permissions.modules.admin) {

          console.log('Atualizando permissões de administrador...');

          // Atualizar permissões
          const { error: updateError } = await supabase
            .from('users')
            .update({
              access_permissions: {
                ...(adminByEmail.access_permissions || {}),
                modules: {
                  ...(adminByEmail.access_permissions?.modules || {}),
                  admin: true
                }
              }
            })
            .eq('id', adminByEmail.id);

          if (updateError) {
            console.error('Erro ao atualizar permissões de administrador:', updateError);
            return false;
          }

          console.log('Permissões de administrador atualizadas com sucesso');
        }
      }

      return true;
    }
  } catch (error) {
    console.error('Erro ao verificar perfil do administrador:', error);
    return false;
  }
}

// Executar a função principal
ensureAdminProfile()
  .then(success => {
    if (success) {
      console.log('Perfil do administrador verificado e configurado com sucesso!');
      process.exit(0);
    } else {
      console.error('Falha ao verificar ou configurar o perfil do administrador');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
