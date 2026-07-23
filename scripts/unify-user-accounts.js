/**
 * Script para unificar contas de usuários no Supabase
 * 
 * Este script busca usuários com o mesmo e-mail ou telefone e os unifica
 * 
 * Certifique-se de que as variáveis de ambiente estão configuradas:
 * - NEXT_PUBLIC_SUPABASE_URL: URL do projeto Supabase
 * - SUPABASE_SERVICE_KEY: Chave de serviço do Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Verificar se as variáveis de ambiente estão configuradas
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL ou SUPABASE_SERVICE_KEY não estão definidos. Configure as variáveis de ambiente.');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Função para unificar contas de usuários
async function unifyUserAccounts() {
  console.log('Iniciando unificação de contas de usuários...');
  
  try {
    // Buscar todos os usuários
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError);
      return false;
    }
    
    if (!users || users.length === 0) {
      console.log('Nenhum usuário encontrado.');
      return true;
    }
    
    console.log(`Encontrados ${users.length} usuários.`);
    
    // Mapear usuários por e-mail e telefone
    const usersByEmail = {};
    const usersByPhone = {};
    
    users.forEach(user => {
      if (user.email) {
        if (!usersByEmail[user.email]) {
          usersByEmail[user.email] = [];
        }
        usersByEmail[user.email].push(user);
      }
      
      if (user.phone_number) {
        if (!usersByPhone[user.phone_number]) {
          usersByPhone[user.phone_number] = [];
        }
        usersByPhone[user.phone_number].push(user);
      }
    });
    
    // Encontrar contas duplicadas por e-mail
    const duplicateEmails = Object.keys(usersByEmail).filter(email => usersByEmail[email].length > 1);
    console.log(`Encontradas ${duplicateEmails.length} contas com e-mails duplicados.`);
    
    // Encontrar contas duplicadas por telefone
    const duplicatePhones = Object.keys(usersByPhone).filter(phone => usersByPhone[phone].length > 1);
    console.log(`Encontradas ${duplicatePhones.length} contas com telefones duplicados.`);
    
    // Unificar contas duplicadas por e-mail
    for (const email of duplicateEmails) {
      const accounts = usersByEmail[email];
      console.log(`Unificando ${accounts.length} contas com o e-mail ${email}...`);
      
      // Ordenar contas por data de criação (mais antiga primeiro)
      accounts.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      
      // A primeira conta será a principal
      const primaryAccount = accounts[0];
      console.log(`Conta principal: ${primaryAccount.id} (${primaryAccount.email})`);
      
      // Atualizar a conta principal com informações das outras contas
      for (let i = 1; i < accounts.length; i++) {
        const secondaryAccount = accounts[i];
        console.log(`Mesclando conta secundária: ${secondaryAccount.id} (${secondaryAccount.email})`);
        
        // Atualizar telefone se não existir na conta principal
        if (secondaryAccount.phone_number && !primaryAccount.phone_number) {
          console.log(`Atualizando telefone da conta principal para: ${secondaryAccount.phone_number}`);
          
          const { data: updateData, error: updateError } = await supabase
            .from('users')
            .update({ phone_number: secondaryAccount.phone_number })
            .eq('id', primaryAccount.id);
          
          if (updateError) {
            console.error(`Erro ao atualizar telefone da conta principal:`, updateError);
          }
        }
        
        // Transferir permissões
        const { data: permissions, error: permissionsError } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', secondaryAccount.id);
        
        if (!permissionsError && permissions && permissions.length > 0) {
          console.log(`Transferindo ${permissions.length} permissões...`);
          
          for (const permission of permissions) {
            // Verificar se a permissão já existe na conta principal
            const { data: existingPermission, error: existingPermissionError } = await supabase
              .from('user_permissions')
              .select('*')
              .eq('user_id', primaryAccount.id)
              .eq('module', permission.module)
              .maybeSingle();
            
            if (!existingPermissionError && !existingPermission) {
              // Criar nova permissão para a conta principal
              const { error: insertError } = await supabase
                .from('user_permissions')
                .insert({
                  user_id: primaryAccount.id,
                  module: permission.module,
                  feature: permission.feature
                });
              
              if (insertError) {
                console.error(`Erro ao transferir permissão ${permission.module}:`, insertError);
              }
            }
          }
        }
        
        // Transferir histórico de acesso
        const { data: history, error: historyError } = await supabase
          .from('access_history')
          .select('*')
          .eq('user_id', secondaryAccount.id);
        
        if (!historyError && history && history.length > 0) {
          console.log(`Transferindo ${history.length} registros de histórico...`);
          
          for (const record of history) {
            const { error: insertError } = await supabase
              .from('access_history')
              .insert({
                user_id: primaryAccount.id,
                action: record.action,
                details: `[Transferido da conta ${secondaryAccount.id}] ${record.details}`,
                ip_address: record.ip_address,
                user_agent: record.user_agent,
                created_at: record.created_at
              });
            
            if (insertError) {
              console.error(`Erro ao transferir histórico:`, insertError);
            }
          }
        }
        
        // Desativar a conta secundária
        console.log(`Desativando conta secundária: ${secondaryAccount.id}`);
        
        const { error: deactivateError } = await supabase
          .from('users')
          .update({
            active: false,
            deactivation_reason: `Conta unificada com ${primaryAccount.id} (${primaryAccount.email})`,
            updated_at: new Date().toISOString()
          })
          .eq('id', secondaryAccount.id);
        
        if (deactivateError) {
          console.error(`Erro ao desativar conta secundária:`, deactivateError);
        }
      }
    }
    
    // Unificar contas duplicadas por telefone (apenas as que não foram unificadas por e-mail)
    for (const phone of duplicatePhones) {
      const accounts = usersByPhone[phone];
      
      // Filtrar apenas contas ativas (que não foram desativadas na etapa anterior)
      const activeAccounts = accounts.filter(account => account.active !== false);
      
      if (activeAccounts.length <= 1) {
        continue; // Não há contas duplicadas ativas
      }
      
      console.log(`Unificando ${activeAccounts.length} contas com o telefone ${phone}...`);
      
      // Ordenar contas por data de criação (mais antiga primeiro)
      activeAccounts.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      
      // A primeira conta será a principal
      const primaryAccount = activeAccounts[0];
      console.log(`Conta principal: ${primaryAccount.id} (${primaryAccount.phone_number})`);
      
      // Atualizar a conta principal com informações das outras contas
      for (let i = 1; i < activeAccounts.length; i++) {
        const secondaryAccount = activeAccounts[i];
        console.log(`Mesclando conta secundária: ${secondaryAccount.id} (${secondaryAccount.phone_number})`);
        
        // Atualizar e-mail se não existir na conta principal
        if (secondaryAccount.email && !primaryAccount.email) {
          console.log(`Atualizando e-mail da conta principal para: ${secondaryAccount.email}`);
          
          const { data: updateData, error: updateError } = await supabase
            .from('users')
            .update({ email: secondaryAccount.email })
            .eq('id', primaryAccount.id);
          
          if (updateError) {
            console.error(`Erro ao atualizar e-mail da conta principal:`, updateError);
          }
        }
        
        // Transferir permissões
        const { data: permissions, error: permissionsError } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', secondaryAccount.id);
        
        if (!permissionsError && permissions && permissions.length > 0) {
          console.log(`Transferindo ${permissions.length} permissões...`);
          
          for (const permission of permissions) {
            // Verificar se a permissão já existe na conta principal
            const { data: existingPermission, error: existingPermissionError } = await supabase
              .from('user_permissions')
              .select('*')
              .eq('user_id', primaryAccount.id)
              .eq('module', permission.module)
              .maybeSingle();
            
            if (!existingPermissionError && !existingPermission) {
              // Criar nova permissão para a conta principal
              const { error: insertError } = await supabase
                .from('user_permissions')
                .insert({
                  user_id: primaryAccount.id,
                  module: permission.module,
                  feature: permission.feature
                });
              
              if (insertError) {
                console.error(`Erro ao transferir permissão ${permission.module}:`, insertError);
              }
            }
          }
        }
        
        // Transferir histórico de acesso
        const { data: history, error: historyError } = await supabase
          .from('access_history')
          .select('*')
          .eq('user_id', secondaryAccount.id);
        
        if (!historyError && history && history.length > 0) {
          console.log(`Transferindo ${history.length} registros de histórico...`);
          
          for (const record of history) {
            const { error: insertError } = await supabase
              .from('access_history')
              .insert({
                user_id: primaryAccount.id,
                action: record.action,
                details: `[Transferido da conta ${secondaryAccount.id}] ${record.details}`,
                ip_address: record.ip_address,
                user_agent: record.user_agent,
                created_at: record.created_at
              });
            
            if (insertError) {
              console.error(`Erro ao transferir histórico:`, insertError);
            }
          }
        }
        
        // Desativar a conta secundária
        console.log(`Desativando conta secundária: ${secondaryAccount.id}`);
        
        const { error: deactivateError } = await supabase
          .from('users')
          .update({
            active: false,
            deactivation_reason: `Conta unificada com ${primaryAccount.id} (${primaryAccount.phone_number})`,
            updated_at: new Date().toISOString()
          })
          .eq('id', secondaryAccount.id);
        
        if (deactivateError) {
          console.error(`Erro ao desativar conta secundária:`, deactivateError);
        }
      }
    }
    
    console.log('Unificação de contas concluída com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao unificar contas de usuários:', error);
    return false;
  }
}

// Função principal
async function main() {
  console.log('Iniciando script para unificar contas de usuários...');
  
  const success = await unifyUserAccounts();
  
  if (success) {
    console.log('Script concluído com sucesso!');
  } else {
    console.error('Falha ao executar o script.');
    process.exit(1);
  }
}

// Executar a função principal
main();
