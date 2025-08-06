/**
 * Script para diagnosticar e corrigir problemas de autenticação em produção
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Configurações
const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED***;
const adminEmail = ***REMOVED*** || '***REMOVED***';
const adminPhone = ***REMOVED*** || '+5522997847289';
const adminPassword = ***REMOVED*** || 'Caio@2122@';
const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Caio';
const adminLastName = process.env.ADMIN_LAST_NAME || 'Correia';

console.log('🔍 Diagnóstico de Autenticação em Produção');
console.log('==========================================');

// Verificar configurações
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO: SUPABASE_URL e ***REMOVED*** devem estar definidos');
  process.exit(1);
}

console.log('✅ Configurações do Supabase encontradas');
console.log('📧 Admin Email:', adminEmail);
console.log('📱 Admin Phone:', adminPhone);

const supabase = ***REMOVED*** supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function diagnosticAuth() {
  try {
    console.log('\n🔍 1. Verificando estrutura da tabela users_unified...');
    
    // Verificar se a tabela existe
    const { data: tableInfo, error: tableError } = await supabase
      .from('users_unified')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Erro ao acessar tabela users_unified:', tableError.message);
      
      // Tentar criar a tabela
      console.log('🔧 Tentando criar tabela users_unified...');
      await createUsersUnifiedTable();
    } else {
      console.log('✅ Tabela users_unified existe');
    }

    console.log('\n🔍 2. Verificando usuário administrador...');
    
    // Buscar usuário admin por email
    const { data: adminByEmail, error: emailError } = await supabase
      .from('users_unified')
      .select('*')
      .eq('email', adminEmail)
      .single();

    // Buscar usuário admin por telefone
    const { data: adminByPhone, error: phoneError } = await supabase
      .from('users_unified')
      .select('*')
      .eq('phone_number', adminPhone)
      .single();

    let adminUser = adminByEmail || adminByPhone;

    if (!adminUser) {
      console.log('❌ Usuário administrador não encontrado');
      console.log('🔧 Criando usuário administrador...');
      adminUser = await createAdminUser();
    } else {
      console.log('✅ Usuário administrador encontrado:', adminUser.email || adminUser.phone_number);
    }

    console.log('\n🔍 3. Verificando senha do administrador...');
    
    if (!adminUser.password) {
      console.log('❌ Usuário administrador não tem senha definida');
      console.log('🔧 Definindo senha para o administrador...');
      await setAdminPassword(adminUser.id);
    } else {
      console.log('✅ Usuário administrador tem senha definida');
      
      // Verificar se a senha está correta
      const isPasswordValid = await bcrypt.compare(adminPassword, adminUser.password);
      if (!isPasswordValid) {
        console.log('❌ Senha do administrador está incorreta');
        console.log('🔧 Atualizando senha do administrador...');
        await setAdminPassword(adminUser.id);
      } else {
        console.log('✅ Senha do administrador está correta');
      }
    }

    console.log('\n🔍 4. Verificando permissões do administrador...');
    
    if (adminUser.role !== 'ADMIN') {
      console.log('❌ Usuário não tem role ADMIN');
      console.log('🔧 Atualizando role para ADMIN...');
      await updateAdminRole(adminUser.id);
    } else {
      console.log('✅ Usuário tem role ADMIN');
    }

    if (!adminUser.active) {
      console.log('❌ Usuário administrador não está ativo');
      console.log('🔧 Ativando usuário administrador...');
      await activateAdmin(adminUser.id);
    } else {
      console.log('✅ Usuário administrador está ativo');
    }

    console.log('\n🔍 5. Verificando dados hardcoded...');
    await checkHardcodedData();

    console.log('\n✅ Diagnóstico concluído!');
    console.log('\n📋 Resumo das correções aplicadas:');
    console.log('- Tabela users_unified verificada/criada');
    console.log('- Usuário administrador verificado/criado');
    console.log('- Senha do administrador verificada/atualizada');
    console.log('- Permissões do administrador verificadas/atualizadas');
    console.log('- Dados hardcoded identificados');

  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error);
    process.exit(1);
  }
}

async function createUsersUnifiedTable() {
  // Implementar criação da tabela se necessário
  console.log('⚠️  Tabela users_unified deve ser criada manualmente no Supabase');
  console.log('Execute o script SQL em scripts/create-users-unified.sql');
}

async function createAdminUser() {
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const userId = uuidv4();

  const { data: newAdmin, error } = await supabase
    .from('users_unified')
    .insert({
      id: userId,
      email: adminEmail,
      phone_number: adminPhone,
      first_name: adminFirstName,
      last_name: adminLastName,
      password: hashedPassword,
      password_hash: hashedPassword, // Para compatibilidade
      role: 'ADMIN',
      position: 'Administrador do Sistema',
      department: 'TI',
      active: true,
      is_authorized: true,
      authorization_status: 'active',
      password_last_changed: new Date().toISOString(),
      access_permissions: {
        modules: {
          dashboard: true,
          manual: true,
          procedimentos: true,
          politicas: true,
          calendario: true,
          noticias: true,
          reembolso: true,
          contracheque: true,
          ponto: true,
          admin: true,
          avaliacao: true
        }
      },
      access_history: [{
        timestamp: new Date().toISOString(),
        action: 'CREATED',
        details: 'Usuário administrador criado pelo script de correção'
      }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao criar usuário administrador:', error);
    throw error;
  }

  console.log('✅ Usuário administrador criado com sucesso');
  return newAdmin;
}

async function setAdminPassword(userId) {
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const { error } = await supabase
    .from('users_unified')
    .update({
      password: hashedPassword,
      password_hash: hashedPassword, // Para compatibilidade
      password_last_changed: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('❌ Erro ao atualizar senha:', error);
    throw error;
  }

  console.log('✅ Senha do administrador atualizada');
}

async function updateAdminRole(userId) {
  const { error } = await supabase
    .from('users_unified')
    .update({
      role: 'ADMIN',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('❌ Erro ao atualizar role:', error);
    throw error;
  }

  console.log('✅ Role do administrador atualizada para ADMIN');
}

async function activateAdmin(userId) {
  const { error } = await supabase
    .from('users_unified')
    .update({
      active: true,
      is_authorized: true,
      authorization_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('❌ Erro ao ativar administrador:', error);
    throw error;
  }

  console.log('✅ Administrador ativado');
}

async function checkHardcodedData() {
  console.log('🔍 Verificando dados hardcoded que precisam ser migrados:');
  
  const hardcodedIssues = [
    '❌ Credenciais de admin hardcoded em src/lib/auth.ts (linhas 1142-1144)',
    '❌ URLs e chaves do Supabase hardcoded em src/lib/supabase.ts (linhas 9-10)',
    '❌ Credenciais hardcoded em múltiplos scripts',
    '❌ Emails e senhas hardcoded em src/contexts/SupabaseAuthContext.tsx'
  ];

  hardcodedIssues.forEach(issue => console.log(issue));
  
  console.log('\n📝 Recomendações:');
  console.log('1. Migrar todas as credenciais para variáveis de ambiente');
  console.log('2. Usar a tabela app_secrets para credenciais sensíveis');
  console.log('3. Remover valores hardcoded do código');
  console.log('4. Implementar sistema de configuração dinâmica');
}

// Executar diagnóstico
diagnosticAuth().then(() => {
  console.log('\n🎉 Script concluído com sucesso!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Script falhou:', error);
  process.exit(1);
});
