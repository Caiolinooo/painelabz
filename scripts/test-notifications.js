/**
 * Script para testar a criação de notificações
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED*** || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testNotifications() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente não configuradas');
    }

    console.log('🔧 Testando sistema de notificações...');

    const supabase = ***REMOVED*** supabaseServiceKey);

    // 1. Verificar se a tabela notifications existe
    console.log('\n1️⃣ Verificando tabela notifications...');
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);

      if (error) {
        console.log('❌ Tabela notifications não existe ou erro:', error.message);

        // Tentar criar a tabela
        console.log('\n🔧 Criando tabela notifications...');
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES users_unified(id) ON DELETE CASCADE,
            type VARCHAR(100) DEFAULT 'info',
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            data JSONB NULL,
            read BOOLEAN DEFAULT FALSE,
            push_sent BOOLEAN DEFAULT FALSE,
            email_sent BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;

        console.log('⚠️  SQL para criar tabela:', createTableSQL);
        console.log('ℹ️  Execute este SQL manualmente no painel Supabase');
      } else {
        console.log('✅ Tabela notifications existe');
      }
    } catch (e) {
      console.log('❌ Erro ao verificar tabela:', e.message);
    }

    // 2. Buscar um usuário para testar
    console.log('\n2️⃣ Buscando usuário para teste...');
    const { data: users, error: userError } = await supabase
      .from('users_unified')
      .select('id, first_name, last_name')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.log('❌ Nenhum usuário encontrado para teste');
      return;
    }

    const testUser = users[0];
    console.log('✅ Usuário encontrado:', testUser.first_name, testUser.last_name);

    // 3. Tentar criar uma notificação de teste
    console.log('\n3️⃣ Criando notificação de teste...');
    try {
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: testUser.id,
          type: 'test',
          title: 'Notificação de Teste',
          message: 'Esta é uma notificação de teste do sistema de avaliações',
          data: { test: true, timestamp: new Date().toISOString() }
        })
        .select('id')
        .single();

      if (notifError) {
        console.log('❌ Erro ao criar notificação:', notifError.message);
        console.log('Detalhes:', JSON.stringify(notifError, null, 2));
      } else {
        console.log('✅ Notificação criada com sucesso! ID:', notifData.id);
      }
    } catch (e) {
      console.log('❌ Erro na criação:', e.message);
    }

    // 4. Listar notificações existentes
    console.log('\n4️⃣ Listando notificações existentes...');
    try {
      const { data: notifs, error: listError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (listError) {
        console.log('❌ Erro ao listar notificações:', listError.message);
      } else {
        console.log(`✅ Encontradas ${notifs?.length || 0} notificações recentes:`);
        notifs?.forEach((notif, index) => {
          console.log(`   ${index + 1}. ${notif.title} (${notif.type}) - ${new Date(notif.created_at).toLocaleString('pt-BR')}`);
        });
      }
    } catch (e) {
      console.log('❌ Erro na listagem:', e.message);
    }

    console.log('\n🎉 Teste de notificações concluído!');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    process.exit(1);
  }
}

testNotifications();