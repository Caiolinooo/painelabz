import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushToUserIds } from '@/lib/push';
import { supabaseWithRetry, logError, logPerformance } from '@/lib/apiRetry';

export const dynamic = 'force-dynamic';

// GET - Listar notificações do usuário
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const unread_only = searchParams.get('unread_only') === 'true';

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`🔄 API Notifications - Listando notificações do usuário ${user_id}`);

    // Verificar se o Supabase está configurado
    if (!supabaseAdmin) {
      logError('Supabase Configuration', new Error('Supabase admin não configurado'));
      return NextResponse.json(
        { error: 'Configuração do banco de dados não encontrada' },
        { status: 500 }
      );
    }

    // Construir query com timeout e retry
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (type) {
      query = query.eq('type', type);
    }

    if (unread_only) {
      query = query.is('read_at', null);
    }

    // Filtrar notificações não expiradas (com tratamento de erro)
    try {
      const currentDate = new Date().toISOString();
      query = query.or(`expires_at.is.null,expires_at.gt.${currentDate}`);
    } catch (dateError) {
      console.warn('⚠️ Erro ao aplicar filtro de data, continuando sem filtro:', dateError);
    }

    // Aplicar paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Executar queries em paralelo para melhor performance
    const [notificationsResult, totalResult, unreadResult] = await Promise.all([
      // 1. Buscar notificações
      supabaseWithRetry(
        async () => query,
        { maxRetries: 2, delay: 1000, timeout: 8000 }
      ),
      // 2. Buscar contagem total
      supabaseWithRetry(
        async () => {
          const currentDate = new Date().toISOString();
          return supabaseAdmin
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .or(`expires_at.is.null,expires_at.gt.${currentDate}`);
        },
        { maxRetries: 1, delay: 500, timeout: 5000 }
      ),
      // 3. Buscar contagem não lidas
      supabaseWithRetry(
        async () => {
          const currentDate = new Date().toISOString();
          return supabaseAdmin
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .is('read_at', null)
            .or(`expires_at.is.null,expires_at.gt.${currentDate}`);
        },
        { maxRetries: 1, delay: 500, timeout: 5000 }
      )
    ]);

    const { data: notifications, error, attempts } = notificationsResult;
    const { count: totalCount, error: totalError } = totalResult.data ? { count: totalResult.data.count, error: null } : { count: 0, error: totalResult.error };
    const { count: unreadCount, error: unreadError } = unreadResult.data ? { count: unreadResult.data.count, error: null } : { count: 0, error: unreadResult.error };

    console.log(`📊 Queries executadas. Notificações: ${(notifications as any[])?.length || 0}, Total: ${totalCount}, Não lidas: ${unreadCount}`);

    if (error) {
      logError('Notifications Query', error, { user_id, page, limit, attempts });
      // ... erro handling mantido abaixo ...
    }

    console.log(`✅ ${(notifications as any[])?.length || 0} notificações carregadas (${unreadCount} não lidas)`);

    // Log de performance
    logPerformance('GET /api/notifications', startTime, {
      user_id,
      count: (notifications as any[])?.length || 0,
      unreadCount,
      attempts
    });

    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasNext: page * limit < (totalCount || 0),
        hasPrev: page > 1
      },
      unreadCount: unreadCount || 0
    });

  } catch (error) {
    logError('GET /api/notifications - Critical Error', error, {
      user_id: new URL(request.url).searchParams.get('user_id'),
      duration: Date.now() - startTime
    });

    // Retornar resposta vazia para não quebrar a UI
    return NextResponse.json({
      notifications: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      unreadCount: 0,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// POST - Criar nova notificação
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      type,
      title,
      message,
      data = {},
      action_url,
      priority = 'normal',
      expires_at
    } = body;

    if (!user_id || !type || !title) {
      return NextResponse.json(
        { error: 'user_id, type e title são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`🔄 API Notifications - Criando notificação para usuário ${user_id}: ${title}`);

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabaseAdmin
      .from('users_unified')
      .select('id, first_name, last_name')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Criar notificação
    const notificationData = {
      user_id,
      type,
      title,
      message: message || '',
      data: JSON.stringify(data),
      action_url: action_url || null,
      priority,
      expires_at: expires_at || null,
      created_at: new Date().toISOString()
    };

    const { data: newNotification, error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao criar notificação:', insertError);
      return NextResponse.json(
        { error: 'Erro ao criar notificação' },
        { status: 500 }
      );
    }

    console.log(`✅ Notificação criada: ${newNotification.title} para ${user.first_name}`);

    // Enviar push notification se VAPID estiver configurado (não bloqueante)
    try {
      await sendPushToUserIds([user_id], { title, body: message || '', url: action_url || '/' });
    } catch (e) {
      console.warn('Falha ao enviar push (não bloqueante):', e);
    }

    return NextResponse.json(newNotification, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir notificações
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const notificationIds = searchParams.get('notification_ids')?.split(',').filter(id => id.trim());
    const deleteAll = searchParams.get('delete_all') === 'true';

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`🗑️ API Notifications - DELETE solicitado para usuário ${user_id}`);

    // Excluir todas as notificações do usuário
    if (deleteAll) {
      const { error: deleteError } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', user_id);

      if (deleteError) {
        console.error('Erro ao excluir todas as notificações:', deleteError);
        return NextResponse.json(
          { error: 'Erro ao excluir notificações' },
          { status: 500 }
        );
      }

      console.log(`✅ Todas as notificações do usuário ${user_id} foram excluídas`);
      return NextResponse.json({
        success: true,
        message: 'Todas as notificações foram excluídas'
      });
    }

    // Excluir notificações específicas
    if (!notificationIds || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'notification_ids é obrigatório quando delete_all=false' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Excluindo ${notificationIds.length} notificação(ões): ${notificationIds.join(', ')}`);

    const { error: deleteError, count } = await supabaseAdmin
      .from('notifications')
      .delete({ count: 'exact' })
      .in('id', notificationIds)
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('Erro ao excluir notificações específicas:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao excluir notificações' },
        { status: 500 }
      );
    }

    console.log(`✅ ${count || 0} notificação(ões) excluída(s) com sucesso`);

    return NextResponse.json({
      success: true,
      message: 'Notificações excluídas com sucesso',
      deletedCount: count || 0
    });

  } catch (error) {
    console.error('Erro ao excluir notificações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
