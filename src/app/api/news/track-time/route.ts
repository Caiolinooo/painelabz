import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Beacon envia como text/plain as vezes, precisamos lidar com isso
        // Mas enviamos blob type application/json no componente
        let body;
        try {
            const text = await request.text();
            body = JSON.parse(text);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { postId, userId, duration } = body;

        console.log(`⏱️ Tracking Time: Post ${postId} - ${duration}s`);

        if (!postId || !duration) return NextResponse.json({ success: false });

        // Atualizar ou inserir. 
        // Estratégia: Inserir log novo ou somar ao existente do dia?
        // Para analytics preciso, melhor logs granulares, mas para MVP vamos somar na view de hoje.

        const today = new Date().toISOString().split('T')[0];

        // Tentar atualizar view existente do dia
        const { data: existing, error } = await supabaseAdmin
            .from('news_post_views')
            .select('id, duration_seconds')
            .eq('post_id', postId)
            .eq('user_id', userId) // Se user logado
            .gte('viewed_at', `${today}T00:00:00.000Z`)
            .limit(1)
            .single();

        if (existing) {
            await supabaseAdmin
                .from('news_post_views')
                .update({ duration_seconds: (existing.duration_seconds || 0) + duration })
                .eq('id', existing.id);
        } else {
            // Se não achou view (ex: view tracker disparou mas o view inicial 5s falhou ou foi outra sessão)
            // Cria novo registro
            await supabaseAdmin.from('news_post_views').insert({
                post_id: postId,
                user_id: userId,
                duration_seconds: duration,
                viewed_at: new Date().toISOString()
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Time tracking error:', error);
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}
