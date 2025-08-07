import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Processar lembretes pendentes (para cron job)
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API Reminders Process - Processando lembretes pendentes...');

    // Buscar lembretes que devem ser enviados agora
    const now = new Date().toISOString();
    const { data: pendingReminders, error: fetchError } = await supabaseAdmin
      .from('reminders')
      .select(`
        *,
        user:users_unified!user_id (
          id,
          first_name,
          last_name,
          email,
          role
        ),
        post:news_posts!post_id (
          id,
          title,
          status
        )
      `)
      .eq('status', 'pending')
      .lte('remind_at', now);

    if (fetchError) {
      console.error('Erro ao buscar lembretes pendentes:', fetchError);
      return NextResponse.json(
        { error: 'Erro ao buscar lembretes pendentes' },
        { status: 500 }
      );
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      console.log('✅ Nenhum lembrete pendente para processar');
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'Nenhum lembrete pendente'
      });
    }

    console.log(`📋 ${pendingReminders.length} lembretes pendentes encontrados`);

    let processedCount = 0;
    let errorCount = 0;

    // Processar cada lembrete
    for (const reminder of pendingReminders) {
      try {
        console.log(`📤 Processando lembrete: ${reminder.title}`);

        // 1. Criar notificação para o criador do lembrete
        await createReminderNotification(reminder, reminder.user);

        // 2. Criar notificações para usuários específicos
        if (reminder.target_users && reminder.target_users.length > 0) {
          const targetUserIds = JSON.parse(reminder.target_users);
          for (const userId of targetUserIds) {
            const { data: targetUser } = await supabaseAdmin
              .from('users_unified')
              .select('id, first_name, last_name, email')
              .eq('id', userId)
              .single();

            if (targetUser) {
              await createReminderNotification(reminder, targetUser);
            }
          }
        }

        // 3. Criar notificações para usuários por role
        if (reminder.target_roles && reminder.target_roles.length > 0) {
          const targetRoles = JSON.parse(reminder.target_roles);
          for (const role of targetRoles) {
            const { data: roleUsers } = await supabaseAdmin
              .from('users_unified')
              .select('id, first_name, last_name, email')
              .eq('role', role);

            if (roleUsers) {
              for (const roleUser of roleUsers) {
                await createReminderNotification(reminder, roleUser);
              }
            }
          }
        }

        // 4. Marcar lembrete como enviado
        await supabaseAdmin
          .from('reminders')
          .update({ status: 'sent' })
          .eq('id', reminder.id);

        processedCount++;
        console.log(`✅ Lembrete processado: ${reminder.title}`);

      } catch (reminderError) {
        console.error(`❌ Erro ao processar lembrete ${reminder.id}:`, reminderError);
        errorCount++;
      }
    }

    console.log(`🎯 Processamento concluído: ${processedCount} enviados, ${errorCount} erros`);

    return NextResponse.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: pendingReminders.length,
      message: `${processedCount} lembretes processados com sucesso`
    });

  } catch (error) {
    console.error('Erro ao processar lembretes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Função auxiliar para criar notificação de lembrete
async function createReminderNotification(reminder: any, user: any) {
  try {
    const notificationData = {
      user_id: user.id,
      type: 'reminder',
      title: `Lembrete: ${reminder.title}`,
      message: reminder.message || 'Você tem um lembrete agendado.',
      data: ***REMOVED***
        reminder_id: reminder.id,
        post_id: reminder.post_id,
        original_remind_at: reminder.remind_at
      }),
      action_url: reminder.post_id ? `/news/posts/${reminder.post_id}` : null,
      priority: 'normal',
      created_at: new Date().toISOString()
    };

    const { error } = await supabaseAdmin
      .from('notifications')
      .insert(notificationData);

    if (error) {
      console.error('Erro ao criar notificação de lembrete:', error);
    } else {
      console.log(`📬 Notificação criada para ${user.first_name}: ${reminder.title}`);
    }
  } catch (error) {
    console.error('Erro ao criar notificação de lembrete:', error);
  }
}

// GET - Obter estatísticas de lembretes (para monitoramento)
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 API Reminders Process - Obtendo estatísticas...');

    // Contar lembretes por status
    const { data, error } = await supabaseAdmin
      .from('reminders')
      .select('status');

    if (error) {
      console.error('Erro ao obter lembretes:', error);
      return NextResponse.json(
        { error: 'Erro ao obter estatísticas' },
        { status: 500 }
      );
    }

    const stats = {
      pending: 0,
      sent: 0,
      cancelled: 0,
      total: data?.length || 0
    };

    data?.forEach(reminder => {
      if (reminder.status in stats) {
        stats[reminder.status as keyof typeof stats]++;
      }
    });

    // Contar lembretes que devem ser processados agora
    const now = new Date().toISOString();
    const { count: dueCoun } = await supabaseAdmin
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('remind_at', now);

    console.log('✅ Estatísticas obtidas');

    return NextResponse.json({
      ...stats,
      due_now: dueCoun || 0,
      last_check: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
