#!/usr/bin/env node

/**
 * Script to check password state for users in the database
 * This helps diagnose login issues related to password storage
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED***;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL e ***REMOVED*** são obrigatórias');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUserPasswords() {
  console.log('🔍 Verificando estado das senhas no banco de dados...\n');

  try {
    // Buscar todos os usuários
    const { data: users, error } = await supabase
      .from('users_unified')
      .select('id, email, phone_number, first_name, last_name, password, password_hash, email_verified, active')
      .order('email');

    if (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado');
      return;
    }

    console.log(`✅ Encontrados ${users.length} usuários\n`);
    console.log('═══════════════════════════════════════════════════════════════════');

    for (const user of users) {
      const email = user.email || 'N/A';
      const phone = user.phone_number || 'N/A';
      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A';

      console.log(`\n📧 Email: ${email}`);
      console.log(`📱 Telefone: ${phone}`);
      console.log(`👤 Nome: ${name}`);
      console.log(`🔑 ID: ${user.id}`);

      // Verificar campo 'password'
      if (user.password) {
        const passwordStr = user.password;
        const isBcrypt = passwordStr.startsWith('$2a$') || passwordStr.startsWith('$2b$') || passwordStr.startsWith('$2y$');
        console.log(`   password: ${isBcrypt ? '✅ Hash bcrypt válido' : '❌ NÃO é hash bcrypt (plaintext?)'}`);
        console.log(`   password (preview): ${passwordStr.substring(0, 30)}...`);
      } else {
        console.log(`   password: ❌ NÃO definido`);
      }

      // Verificar campo 'password_hash'
      if (user.password_hash) {
        const passwordHashStr = user.password_hash;
        const isBcrypt = passwordHashStr.startsWith('$2a$') || passwordHashStr.startsWith('$2b$') || passwordHashStr.startsWith('$2y$');
        console.log(`   password_hash: ${isBcrypt ? '✅ Hash bcrypt válido' : '❌ NÃO é hash bcrypt (plaintext?)'}`);
        console.log(`   password_hash (preview): ${passwordHashStr.substring(0, 30)}...`);
      } else {
        console.log(`   password_hash: ⚠️  NÃO definido`);
      }

      // Status da conta
      console.log(`   email_verified: ${user.email_verified ? '✅' : '❌'}`);
      console.log(`   active: ${user.active ? '✅' : '❌'}`);

      console.log('───────────────────────────────────────────────────────────────────');
    }

    console.log('\n\n📊 RESUMO:');
    console.log('═══════════════════════════════════════════════════════════════════');

    const withPassword = users.filter(u => u.password);
    const withPasswordHash = users.filter(u => u.password_hash);
    const withBcryptPassword = users.filter(u => {
      if (!u.password) return false;
      return u.password.startsWith('$2a$') || u.password.startsWith('$2b$') || u.password.startsWith('$2y$');
    });
    const withPlaintextPassword = users.filter(u => {
      if (!u.password) return false;
      return !(u.password.startsWith('$2a$') || u.password.startsWith('$2b$') || u.password.startsWith('$2y$'));
    });
    const noPassword = users.filter(u => !u.password && !u.password_hash);

    console.log(`Total de usuários: ${users.length}`);
    console.log(`Com campo 'password': ${withPassword.length}`);
    console.log(`Com campo 'password_hash': ${withPasswordHash.length}`);
    console.log(`Com senha bcrypt (password): ${withBcryptPassword.length}`);
    console.log(`Com senha PLAINTEXT (password): ⚠️  ${withPlaintextPassword.length}`);
    console.log(`Sem senha definida: ⚠️  ${noPassword.length}`);

    if (withPlaintextPassword.length > 0) {
      console.log('\n❌ PROBLEMAS ENCONTRADOS:');
      console.log('Os seguintes usuários têm senhas em PLAINTEXT:');
      withPlaintextPassword.forEach(u => {
        console.log(`  - ${u.email || u.phone_number}`);
      });
    }

    if (noPassword.length > 0) {
      console.log('\n⚠️  AVISOS:');
      console.log('Os seguintes usuários NÃO têm senha definida:');
      noPassword.forEach(u => {
        console.log(`  - ${u.email || u.phone_number}`);
      });
    }

    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
    process.exit(1);
  }
}

checkUserPasswords();
