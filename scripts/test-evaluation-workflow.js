#!/usr/bin/env node

/**
 * Script para testar o fluxo completo de notificações de avaliação
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey);

async function testEvaluationWorkflow() {
  console.log('🔄 Testando fluxo completo de notificações de avaliação...\n');

  try {
    // 1. Verificar se existem usuários
    const { data: users, error: usersError } = await supabase
      .from('users_unified')
      .select('id, name, role')
      .eq('active', true)
      .limit(5);

    if (usersError || !users || users.length === 0) {
      console.error('❌ Nenhum usuário ativo encontrado');
      return;
    }

    console.log(`✅ Encontrados ${users.length} usuários ativos`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.role})`);
    });

    // 2. Verificar períodos de avaliação
    const { data: periods, error: periodsError } = await supabase
      .from('periodos_avaliacao')
      .select('id, nome, data_inicio, data_fim, ativo')
      .eq('ativo', true)
      .limit(3);

    if (periodsError) {
      console.error('❌ Erro ao buscar períodos:', periodsError.message);
      return;
    }

    console.log(`\n📅 Períodos de avaliação ativos: ${periods?.length || 0}`);
    periods?.forEach(period => {
      console.log(`   - ${period.nome} (${period.data_inicio} a ${period.data_fim})`);
    });

    // 3. Verificar avaliações existentes
    const { data: evaluations, error: evalError } = await supabase
      .from('avaliacoes_desempenho')
      .select('id, status, funcionario_id, avaliador_id')
      .limit(5);

    if (evalError) {
      console.error('❌ Erro ao buscar avaliações:', evalError.message);
      return;
    }

    console.log(`\n📊 Avaliações existentes: ${evaluations?.length || 0}`);
    evaluations?.forEach(eval => {
      console.log(`   - ID: ${eval.id} | Status: ${eval.status}`);
    });

    // 4. Verificar notificações existentes
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, type, title, user_id, created_at')
      .eq('type', 'evaluation')
      .order('created_at', { ascending: false })
      .limit(10);

    if (notifError) {
      console.error('❌ Erro ao buscar notificações:', notifError.message);
      return;
    }

    console.log(`\n🔔 Notificações de avaliação: ${notifications?.length || 0}`);
    notifications?.forEach(notif => {
      console.log(`   - ${notif.title} (${new Date(notif.created_at).toLocaleString()})`);
    });

    // 5. Testar API de notificação de período aberto
    if (periods && periods.length > 0) {
      console.log('\n🧪 Testando notificação de período aberto...');
      
      try {
        const response = await fetch('http://localhost:3000/api/avaliacao/periodos/notify-opened', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: ***REMOVED***
            periodId: periods[0].id,
            periodName: periods[0].nome
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Notificações enviadas: ${result.notifiedUsers} usuários`);
        } else {
          console.log('⚠️ API não disponível (servidor não rodando)');
        }
      } catch (e) {
        console.log('⚠️ API não disponível (servidor não rodando)');
      }
    }

    // 6. Mostrar fluxo de notificações
    console.log('\n' + '='.repeat(60));
    console.log('📋 FLUXO COMPLETO DE NOTIFICAÇÕES DE AVALIAÇÃO');
    console.log('='.repeat(60));
    console.log('1. 🚀 Período Aberto → Todos os usuários');
    console.log('2. 📝 Avaliação Criada → Colaborador');
    console.log('3. ✅ Autoavaliação Concluída → Gerente');
    console.log('4. 👨‍💼 Revisão Gerencial Pendente → Gerente');
    console.log('5. 🔄 Devolvida para Ajustes → Colaborador');
    console.log('6. 📝 Avaliação Revisada → Gerente');
    console.log('7. 🎉 Avaliação Finalizada → Colaborador');
    console.log('='.repeat(60));

    // 7. Verificar configuração VAPID
    const { data: vapidKeys, error: vapidError } = await supabase
      .from('app_secrets')
      .select('key')
      .like('key', 'VAPID_%');

    if (vapidError) {
      console.log('\n⚠️ Não foi possível verificar chaves VAPID');
    } else {
      const hasAllKeys = vapidKeys?.length === 3;
      console.log(`\n📱 Push Notifications: ${hasAllKeys ? '✅ CONFIGURADO' : '❌ PENDENTE'}`);
      if (!hasAllKeys) {
        console.log('💡 Execute: npm run setup:vapid');
      }
    }

    console.log('\n✅ Teste do fluxo de avaliação concluído!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testEvaluationWorkflow();