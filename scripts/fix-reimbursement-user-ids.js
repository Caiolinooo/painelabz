const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Configurações do Supabase não encontradas');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixReimbursementUserIds() {
  console.log('🔧 Iniciando correção dos user_ids nos reembolsos...');

  try {
    // 1. Buscar todos os reembolsos sem user_id
    console.log('📋 Buscando reembolsos sem user_id...');
    const { data: reimbursements, error: reimbError } = await supabase
      .from('Reimbursement')
      .select('id, email, protocolo')
      .is('user_id', null);

    if (reimbError) {
      throw reimbError;
    }

    console.log(`📊 Encontrados ${reimbursements?.length || 0} reembolsos sem user_id`);

    if (!reimbursements || reimbursements.length === 0) {
      console.log('✅ Todos os reembolsos já têm user_id preenchido');
      return;
    }

    // 2. Buscar todos os usuários para criar um mapa email -> user_id
    console.log('👥 Buscando usuários...');
    const { data: users, error: usersError } = await supabase
      .from('users_unified')
      .select('id, email');

    if (usersError) {
      throw usersError;
    }

    console.log(`👥 Encontrados ${users?.length || 0} usuários`);

    // Criar mapa email -> user_id
    const emailToUserId = {};
    users?.forEach(user => {
      if (user.email) {
        emailToUserId[user.email.toLowerCase().trim()] = user.id;
      }
    });

    // 3. Atualizar reembolsos
    let updated = 0;
    let notFound = 0;

    for (const reimbursement of reimbursements) {
      const email = reimbursement.email?.toLowerCase().trim();
      const userId = emailToUserId[email];

      if (userId) {
        console.log(`🔄 Atualizando reembolso ${reimbursement.protocolo} (${email}) -> ${userId}`);
        
        const { error: updateError } = await supabase
          .from('Reimbursement')
          .update({ user_id: userId })
          .eq('id', reimbursement.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar reembolso ${reimbursement.protocolo}:`, updateError);
        } else {
          updated++;
        }
      } else {
        console.log(`⚠️ Usuário não encontrado para email: ${email} (protocolo: ${reimbursement.protocolo})`);
        notFound++;
      }
    }

    console.log('\n📊 Resumo da correção:');
    console.log(`✅ Reembolsos atualizados: ${updated}`);
    console.log(`⚠️ Usuários não encontrados: ${notFound}`);
    console.log(`📋 Total processado: ${reimbursements.length}`);

    // 4. Verificar resultado
    console.log('\n🔍 Verificando resultado...');
    const { data: remainingNull, error: checkError } = await supabase
      .from('Reimbursement')
      .select('id')
      .is('user_id', null);

    if (checkError) {
      throw checkError;
    }

    console.log(`📊 Reembolsos ainda sem user_id: ${remainingNull?.length || 0}`);

    if (remainingNull?.length === 0) {
      console.log('🎉 Todos os reembolsos agora têm user_id preenchido!');
    }

  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
    process.exit(1);
  }
}

// Executar o script
fixReimbursementUserIds()
  .then(() => {
    console.log('✅ Script concluído com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
