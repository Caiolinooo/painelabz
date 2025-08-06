/**
 * Script para gerar hash da senha e corrigir usuário admin
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configurações
const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED***;
const adminEmail = '***REMOVED***';
const adminPhone = '+5522997847289';
const adminPassword = 'Caio@2122@';

console.log('🔐 Gerando Hash da Senha e Corrigindo Usuário Admin');
console.log('==================================================');

// Gerar hash da senha
const passwordHash = bcrypt.hashSync(adminPassword, 10);
console.log('✅ Hash da senha gerado:');
console.log(passwordHash);
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('📋 Use este hash manualmente no Supabase:');
  console.log('');
  console.log('1. Acesse o Supabase Dashboard');
  console.log('2. Vá para SQL Editor');
  console.log('3. Execute esta query:');
  console.log('');
  console.log(`UPDATE users_unified SET`);
  console.log(`  password = '${passwordHash}',`);
  console.log(`  password_hash = '${passwordHash}',`);
  console.log(`  role = 'ADMIN',`);
  console.log(`  active = true,`);
  console.log(`  is_authorized = true,`);
  console.log(`  authorization_status = 'active',`);
  console.log(`  password_last_changed = NOW(),`);
  console.log(`  updated_at = NOW()`);
  console.log(`WHERE email = '${adminEmail}';`);
  console.log('');
  process.exit(0);
}

const supabase = ***REMOVED*** supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAdminUser() {
  try {
    console.log('🔍 Verificando usuário administrador...');
    
    // Buscar usuário admin
    const { data: existingUser, error: searchError } = await supabase
      .from('users_unified')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.log('❌ Erro ao buscar usuário:', searchError.message);
      throw searchError;
    }

    if (!existingUser) {
      console.log('❌ Usuário não encontrado, criando...');
      
      // Criar usuário admin
      const { data: newUser, error: createError } = await supabase
        .from('users_unified')
        .insert({
          email: adminEmail,
          phone_number: adminPhone,
          first_name: 'Caio',
          last_name: 'Correia',
          password: passwordHash,
          password_hash: passwordHash,
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

      if (createError) {
        console.log('❌ Erro ao criar usuário:', createError.message);
        throw createError;
      }

      console.log('✅ Usuário administrador criado com sucesso!');
      console.log('📧 Email:', newUser.email);
      console.log('📱 Phone:', newUser.phone_number);
      console.log('👤 Role:', newUser.role);
      
    } else {
      console.log('✅ Usuário encontrado, atualizando...');
      
      // Atualizar usuário existente
      const { error: updateError } = await supabase
        .from('users_unified')
        .update({
          password: passwordHash,
          password_hash: passwordHash,
          role: 'ADMIN',
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
          updated_at: new Date().toISOString()
        })
        .eq('email', adminEmail);

      if (updateError) {
        console.log('❌ Erro ao atualizar usuário:', updateError.message);
        throw updateError;
      }

      console.log('✅ Usuário administrador atualizado com sucesso!');
    }

    // Verificar resultado final
    console.log('\n🔍 Verificando resultado final...');
    const { data: finalUser, error: finalError } = await supabase
      .from('users_unified')
      .select('email, phone_number, role, active, password')
      .eq('email', adminEmail)
      .single();

    if (finalError) {
      console.log('❌ Erro ao verificar resultado:', finalError.message);
      throw finalError;
    }

    console.log('✅ Verificação final:');
    console.log('📧 Email:', finalUser.email);
    console.log('📱 Phone:', finalUser.phone_number);
    console.log('👤 Role:', finalUser.role);
    console.log('✅ Active:', finalUser.active);
    console.log('🔐 Has Password:', finalUser.password ? 'Sim' : 'Não');
    console.log('🔐 Password Length:', finalUser.password ? finalUser.password.length : 0);

    // Testar a senha
    console.log('\n🧪 Testando validação da senha...');
    const isPasswordValid = bcrypt.compareSync(adminPassword, finalUser.password);
    console.log('🔐 Senha válida:', isPasswordValid ? '✅ SIM' : '❌ NÃO');

    if (isPasswordValid) {
      console.log('\n🎉 SUCESSO! O usuário administrador está configurado corretamente!');
      console.log('📋 Credenciais para login:');
      console.log('📧 Email: ***REMOVED***');
      console.log('🔑 Senha: Caio@2122@');
      console.log('');
      console.log('🚀 Agora você pode fazer login no sistema!');
    } else {
      console.log('\n❌ ERRO: A senha não está funcionando corretamente.');
    }

  } catch (error) {
    console.error('\n💥 Erro durante a execução:', error);
    
    console.log('\n📋 Execute manualmente no Supabase SQL Editor:');
    console.log('');
    console.log(`UPDATE users_unified SET`);
    console.log(`  password = '${passwordHash}',`);
    console.log(`  password_hash = '${passwordHash}',`);
    console.log(`  role = 'ADMIN',`);
    console.log(`  active = true,`);
    console.log(`  is_authorized = true,`);
    console.log(`  authorization_status = 'active',`);
    console.log(`  password_last_changed = NOW(),`);
    console.log(`  updated_at = NOW()`);
    console.log(`WHERE email = '${adminEmail}';`);
    console.log('');
  }
}

// Executar correção
fixAdminUser().then(() => {
  console.log('\n✅ Script concluído!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Script falhou:', error);
  process.exit(1);
});
