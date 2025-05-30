// Script para testar a API fix-admin
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Criar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Informações do administrador
const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
const adminPassword = process.env.ADMIN_PASSWORD || 'Caio@2122@';
const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Caio';
const adminLastName = process.env.ADMIN_LAST_NAME || 'Correia';

async function testFixAdmin() {
  try {
    console.log('Verificando usuário administrador no Supabase:', { adminEmail, adminPhone });

    // Verificar se o usuário administrador existe na tabela 'users'
    // Primeiro, tentar pelo email
    let existingUser = null;

    const { data: userByEmail, error: emailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (userByEmail) {
      console.log('Usuário administrador encontrado pelo email:', userByEmail.id);
      existingUser = userByEmail;
    } else {
      console.log('Usuário não encontrado pelo email, tentando pelo telefone');

      // Tentar pelo telefone
      const { data: userByPhone, error: phoneError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', adminPhone)
        .single();

      if (userByPhone) {
        console.log('Usuário administrador encontrado pelo telefone:', userByPhone.id);
        existingUser = userByPhone;
      } else {
        console.log('Usuário administrador não encontrado pelo telefone:', phoneError);
      }
    }

    if (!existingUser) {
      console.log('Usuário administrador não encontrado, criando...');

      // Criar usuário diretamente na tabela users
      const userId = '00000000-0000-0000-0000-000000000000';

      const userData = {
        id: userId,
        email: adminEmail,
        phone_number: adminPhone,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: 'ADMIN',
        position: 'Administrador do Sistema',
        department: 'TI',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Dados do usuário a serem inseridos:', userData);

      // Verificar se o usuário já existe com este ID
      const { data: existingUserById, error: existingUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      console.log('Verificação de usuário existente por ID:', existingUserById || 'Não encontrado', existingUserError || 'Sem erro');

      let newUser;
      let profileError;

      if (existingUserById) {
        // Atualizar o usuário existente
        console.log('Usuário já existe, atualizando...');
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            email: adminEmail,
            phone_number: adminPhone,
            first_name: adminFirstName,
            last_name: adminLastName,
            role: 'ADMIN',
            position: 'Administrador do Sistema',
            department: 'TI',
            active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();

        newUser = updatedUser;
        profileError = updateError;
      } else {
        // Inserir novo usuário
        console.log('Inserindo novo usuário...');
        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert(userData)
          .select()
          .single();

        newUser = insertedUser;
        profileError = insertError;
      }

      console.log('Resultado da operação na tabela users:', newUser || 'Sem dados', profileError || 'Sem erro');

      if (profileError) {
        console.error('Erro ao criar perfil do usuário administrador:', profileError);
        return;
      }

      // Adicionar permissões de administrador
      console.log('Adicionando permissões de administrador para o usuário:', newUser?.id);

      try {
        // Verificar se o usuário já tem permissões
        const { data: existingPermissions, error: permCheckError } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', newUser?.id)
          .eq('module', 'admin');

        console.log('Verificação de permissões existentes:', existingPermissions || 'Nenhuma', permCheckError || 'Sem erro');

        if (permCheckError) {
          console.error('Erro ao verificar permissões existentes:', permCheckError);
        }

        // Se não tiver permissões, adicionar
        if (!existingPermissions || existingPermissions.length === 0) {
          const permissionsData = [
            { user_id: newUser?.id, module: 'admin', feature: null },
            { user_id: newUser?.id, module: 'dashboard', feature: null },
            { user_id: newUser?.id, module: 'users', feature: null },
            { user_id: newUser?.id, module: 'settings', feature: null },
            { user_id: newUser?.id, module: 'avaliacao', feature: null }
          ];

          console.log('Dados de permissões a serem inseridos:', permissionsData);

          const { data: permissionsResult, error: permissionsError } = await supabase
            .from('user_permissions')
            .insert(permissionsData);

          console.log('Resultado da inserção de permissões:', permissionsResult || 'Sem dados', permissionsError || 'Sem erro');

          if (permissionsError) {
            console.error('Erro ao adicionar permissões de administrador:', permissionsError);
          }
        } else {
          console.log('Usuário já possui permissões de administrador');
        }
      } catch (error) {
        console.error('Erro ao verificar ou adicionar permissões:', error);
      }

      console.log('Usuário administrador criado com sucesso');
    } else {
      console.log('Usuário administrador encontrado, verificando permissões:', existingUser);

      // Verificar se o usuário tem o papel de administrador
      if (existingUser.role !== 'ADMIN') {
        console.log('Atualizando papel para ADMIN');

        // Atualizar o papel para ADMIN
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'ADMIN' })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('Erro ao atualizar papel do usuário:', updateError);
          return;
        }

        console.log('Papel atualizado para ADMIN com sucesso');
      }

      // Verificar se o usuário tem permissões de administrador
      console.log('Verificando permissões de administrador para o usuário:', existingUser?.id);

      try {
        const { data: permissions, error: permissionsError } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', existingUser?.id)
          .eq('module', 'admin');

        console.log('Permissões encontradas:', permissions || 'Nenhuma', 'Erro:', permissionsError || 'Nenhum');

        if (permissionsError) {
          console.error('Erro ao verificar permissões de administrador:', permissionsError);
        }

        // Se não tiver permissões de administrador, adicionar
        if (!permissions || permissions.length === 0) {
          console.log('Adicionando permissões de administrador para usuário existente');

          const permissionsToAdd = [
            { user_id: existingUser?.id, module: 'admin', feature: null },
            { user_id: existingUser?.id, module: 'dashboard', feature: null },
            { user_id: existingUser?.id, module: 'users', feature: null },
            { user_id: existingUser?.id, module: 'settings', feature: null },
            { user_id: existingUser?.id, module: 'avaliacao', feature: null }
          ];

          console.log('Permissões a serem adicionadas:', permissionsToAdd);

          const { data: insertData, error: insertError } = await supabase
            .from('user_permissions')
            .insert(permissionsToAdd);

          console.log('Resultado da inserção de permissões:', insertData || 'Sem dados', 'Erro:', insertError || 'Nenhum');

          if (insertError) {
            console.error('Erro ao adicionar permissões de administrador:', insertError);
          }
        } else {
          console.log('Usuário já possui permissões de administrador');
        }
      } catch (error) {
        console.error('Erro ao verificar ou adicionar permissões:', error);
      }

      console.log('Usuário administrador verificado e atualizado com sucesso');
    }
  } catch (error) {
    console.error('Erro ao processar solicitação:', error);
  }
}

testFixAdmin();
