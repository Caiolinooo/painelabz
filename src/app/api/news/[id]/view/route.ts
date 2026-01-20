import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyTokenFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - Registrar visualização única
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: newsId } = await context.params;
        const body = await request.json();
        let { userId } = body;

        // Fallback: Tentar obter usuário do token se não vier no body (correção do problema de anônimos)
        if (!userId) {
            const authResult = await verifyTokenFromRequest(request);
            if (authResult.valid && authResult.userId) {
                userId = authResult.userId;
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 401 });
        }

        // Tentar inserir na tabela de views (Unique constraint vai prevenir duplicatas)
        const { error } = await supabaseAdmin
            .from('news_views')
            .insert({
                news_id: newsId,
                user_id: userId
            });

        // Ignorar erro de duplicidade (23505 é violacao de unique Key no Postgres)
        if (error && error.code !== '23505') {
            console.error('Erro ao registrar view:', error);
            // Não retornar 500 para não quebrar o frontend, apenas logar
        } else if (!error) {
            // Se inseriu com sucesso, incrementar o contador denormalizado na tabela news
            // Isso evita ter que fazer COUNT(*) toda vez
            const { error: incError } = await supabaseAdmin.rpc('increment_news_view', { row_id: newsId });

            // Fallback se a RPC não existir: update manual (menos seguro para concorrência mas ok para MVP)
            if (incError) {
                const { data: news } = await supabaseAdmin.from('news').select('views_count').eq('id', newsId).single();
                const current = news?.views_count || 0;
                await supabaseAdmin.from('news').update({ views_count: current + 1 }).eq('id', newsId);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Erro no endpoint de view:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
