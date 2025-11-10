/**
 * Script para marcar como verificados os usuários criados pelo admin
 * Executa via Supabase client
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function fixAdminCreatedUsers() {
  const supabaseUrl = ***REMOVED***;
  const supabaseServiceKey = ***REMOVED***;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não encontradas');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
    console.error('***REMOVED***:', supabaseServiceKey ? 'OK' : 'MISSING');
    process.exit(1);
  }

  const supabase = ***REMOVED*** supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔍 Buscando usuários criados pelo admin antes de 2025-11-07 23:00:00 UTC...\n');

    // Data de corte
    const cutoffDate = '2025-11-07T23:00:00.000Z';

    // Buscar todos os usuários criados antes da data de corte
    const { data: users, error: fetchError } = await supabase
      .from('users_unified')
      .select('id, email, first_name, last_name, email_verified, created_at, access_history')
      .lt('created_at', cutoffDate)
      .eq('email_verified', false);

    if (fetchError) {
      console.error('❌ Erro ao buscar usuários:', fetchError);
      process.exit(1);
    }

    console.log(`📊 Encontrados ${users.length} usuários com email_verified=false\n`);

    // Filtrar apenas os criados por admin
    const adminCreatedUsers = users.filter(user => {
      if (!user.access_history || !Array.isArray(user.access_history)) {
        return false;
      }

      return user.access_history.some(item =>
        item.action === 'CREATED' &&
        item.details &&
        item.details.includes('Usuário criado por')
      );
    });

    console.log(`👤 ${adminCreatedUsers.length} usuários foram criados pelo admin:\n`);

    adminCreatedUsers.forEach(user => {
      const createdByEntry = user.access_history.find(item =>
        item.action === 'CREATED' &&
        item.details &&
        item.details.includes('Usuário criado por')
      );
      console.log(`  - ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`    ${createdByEntry?.details || 'Criado pelo admin'}`);
      console.log(`    Criado em: ${user.created_at}\n`);
    });

    if (adminCreatedUsers.length === 0) {
      console.log('✅ Nenhum usuário precisa ser atualizado');
      process.exit(0);
    }

    console.log('📝 Atualizando usuários...\n');

    // Atualizar cada usuário
    let successCount = 0;
    let errorCount = 0;

    for (const user of adminCreatedUsers) {
      const { error: updateError } = await supabase
        .from('users_unified')
        .update({
          email_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error(`❌ Erro ao atualizar ${user.email}:`, updateError);
        errorCount++;
      } else {
        console.log(`✅ ${user.first_name} ${user.last_name} (${user.email}) → email_verified = true`);
        successCount++;
      }
    }

    console.log('\n📊 RESULTADO:');
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ❌ Erro: ${errorCount}`);
    console.log(`   📝 Total: ${adminCreatedUsers.length}`);

    console.log('\n🎉 Script concluído!');
    console.log('Agora os usuários criados pelo admin podem fazer login sem verificar email.');

  } catch (error) {
    console.error('❌ Erro ao executar script:', error);
    process.exit(1);
  }
}

fixAdminCreatedUsers();
