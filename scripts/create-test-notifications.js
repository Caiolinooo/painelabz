/**
 * Script to create test notifications for a user
 * Usage: node scripts/create-test-notifications.js <user_id>
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED*** || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas');
    process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey);

// Test notification templates
const notificationTemplates = [
    {
        type: 'evaluation',
        title: 'Nova Avaliação Disponível',
        message: 'Você tem uma nova avaliação de desempenho para preencher.',
        priority: 'high',
        action_url: '/avaliacao'
    },
    {
        type: 'news_post',
        title: 'Nova Publicação no Feed',
        message: 'Confira as últimas novidades da empresa!',
        priority: 'normal',
        action_url: '/news'
    },
    {
        type: 'comment',
        title: 'Novo Comentário',
        message: 'Alguém comentou em uma publicação que você segue.',
        priority: 'normal',
        action_url: '/news'
    },
    {
        type: 'like',
        title: 'Curtida em Publicação',
        message: 'Sua publicação recebeu uma nova curtida!',
        priority: 'low',
        action_url: '/news'
    },
    {
        type: 'reminder',
        title: 'Lembrete: Prazo Próximo',
        message: 'Você tem 3 dias para completar sua avaliação de desempenho.',
        priority: 'urgent',
        action_url: '/avaliacao'
    },
    {
        type: 'system',
        title: 'Atualização do Sistema',
        message: 'O sistema foi atualizado com novas funcionalidades.',
        priority: 'low',
        action_url: '/'
    },
    {
        type: 'evaluation',
        title: 'Avaliação Aprovada',
        message: 'Sua avaliação de desempenho foi aprovada pelo gestor.',
        priority: 'normal',
        action_url: '/avaliacao',
        // This one will be marked as read
        read_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    }
];

async function createTestNotifications(userId) {
    console.log(`\n🔧 Criando notificações de teste para o usuário: ${userId}\n`);

    // First, verify the user exists
    const { data: user, error: userError } = await supabase
        .from('users_unified')
        .select('id, first_name, last_name')
        .eq('id', userId)
        .single();

    if (userError || !user) {
        console.error('❌ Usuário não encontrado:', userId);
        process.exit(1);
    }

    console.log(`✅ Usuário encontrado: ${user.first_name} ${user.last_name}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < notificationTemplates.length; i++) {
        const template = notificationTemplates[i];

        const notificationData = {
            user_id: userId,
            type: template.type,
            title: template.title,
            message: template.message,
            data: ***REMOVED*** test: true, index: i }),
            action_url: template.action_url,
            priority: template.priority,
            read_at: template.read_at || null,
            created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString() // Stagger by hours
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(notificationData)
            .select()
            .single();

        if (error) {
            console.error(`❌ Erro ao criar notificação ${i + 1}:`, error.message);
            errorCount++;
        } else {
            const status = data.read_at ? '📖 Lida' : '🔔 Não lida';
            console.log(`✅ ${i + 1}. ${status} - ${template.priority.toUpperCase()} - ${template.title}`);
            successCount++;
        }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ Criadas com sucesso: ${successCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);

    // Verify by counting notifications
    const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (!countError) {
        console.log(`   📧 Total de notificações do usuário: ${count}`);

        const { count: unreadCount, error: unreadError } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('read_at', null);

        if (!unreadError) {
            console.log(`   🔔 Notificações não lidas: ${unreadCount}\n`);
        }
    }
}

// Get user ID from command line argument
const userId = process.argv[2];

if (!userId) {
    console.error('❌ Uso: node scripts/create-test-notifications.js <user_id>');
    console.error('   Exemplo: node scripts/create-test-notifications.js 75abe69b-15ac-4ac2-b973-1075c37252c5');
    process.exit(1);
}

createTestNotifications(userId)
    .then(() => {
        console.log('✅ Script concluído com sucesso!\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Erro fatal:', error);
        process.exit(1);
    });
