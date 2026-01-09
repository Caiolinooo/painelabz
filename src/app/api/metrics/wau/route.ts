import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withPermission } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET - Obter WAU (Usuários ativos nos últimos 7 dias)
export const GET = withPermission('admin', async (request: NextRequest) => {
    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Contar usuários únicos que tiveram atividade nos últimos 7 dias
        // Usando a tabela user_activity
        const { count, error } = await supabaseAdmin
            .from('user_activity')
            .select('*', { count: 'exact', head: true })
            .gte('last_active_at', sevenDaysAgo);

        if (error) {
            console.error('Erro ao buscar WAU:', error);
            throw error;
        }

        // Calcular também o total de usuários ativos (para porcentagem)
        const { count: totalUsers } = await supabaseAdmin
            .from('users_unified') // ou users
            .select('*', { count: 'exact', head: true })
            .eq('active', true);

        const percentage = totalUsers ? Math.round(((count || 0) / totalUsers) * 100) : 0;

        return NextResponse.json({
            wau: count || 0,
            totalUsers: totalUsers || 0,
            percentage,
            period: 'Last 7 days'
        });

    } catch (error) {
        console.error('Erro ao calcular métricas de engajamento:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
});
