// lib/viewTracking.ts - Sistema de tracking de visualizações reais
import { supabaseAdmin } from './supabase';

/**
 * Gera um ID de sessão único baseado em IP + User-Agent
 * Usa Web Crypto API para compatibilidade com edge runtime
 */
export async function generateSessionId(ip?: string, userAgent?: string): Promise<string> {
    const salt = process.env.VIEW_TRACKING_SALT || 'default-salt-change-in-production';
    const data = `${ip || 'unknown'}-${userAgent || 'unknown'}-${salt}`;

    // Usar Web Crypto API (disponível em edge runtime)
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Hash SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

    // Converter para hex
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

/**
 * Registra uma visualização de post
 * @returns true se foi uma nova view, false se já havia visualizado hoje
 */
export async function trackPostView(
    postId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
): Promise<boolean> {
    try {
        const sessionId = await generateSessionId(ip, userAgent);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Verificar se já existe view hoje para essa sessão
        const { data: existingView, error: checkError } = await supabaseAdmin
            .from('news_post_views')
            .select('id')
            .eq('post_id', postId)
            .eq('session_id', sessionId)
            .gte('viewed_at', `${today}T00:00:00.000Z`)
            .lte('viewed_at', `${today}T23:59:59.999Z`)
            .maybeSingle();

        // Se a tabela não existe ainda, fazer fallback para incremento simples
        if (checkError && checkError.code === 'PGRST116') {
            console.warn('⚠️ Tabela news_post_views não existe. Execute a migration! Usando fallback...');

            // Fallback: incrementar sempre (comportamento antigo até migration ser executada)
            const { data: post } = await supabaseAdmin
                .from('news_posts')
                .select('views_count')
                .eq('id', postId)
                .single();

            if (post) {
                await supabaseAdmin
                    .from('news_posts')
                    .update({ views_count: (post.views_count || 0) + 1 })
                    .eq('id', postId);

                console.log(`✅ View incrementada (fallback) para post ${postId}`);
                return true;
            }
            return false;
        }

        if (checkError) {
            console.error('Erro ao verificar view existente:', checkError);
            return false;
        }

        // Se já visualizou hoje, não conta
        if (existingView) {
            console.log(`📊 View já registrada hoje para post ${postId} (session: ${sessionId.substring(0, 8)}...)`);
            return false;
        }

        // Inserir nova visualização
        const { error: insertError } = await supabaseAdmin
            .from('news_post_views')
            .insert({
                post_id: postId,
                user_id: userId || null,
                session_id: sessionId,
                viewed_at: new Date().toISOString()
            });

        if (insertError) {
            console.error('Erro ao inserir view:', insertError);
            return false;
        }

        // Incrementar contador no post
        const { data: post } = await supabaseAdmin
            .from('news_posts')
            .select('views_count')
            .eq('id', postId)
            .single();

        if (post) {
            await supabaseAdmin
                .from('news_posts')
                .update({ views_count: (post.views_count || 0) + 1 })
                .eq('id', postId);
        }

        console.log(`✅ Nova view registrada para post ${postId}`);
        return true;
    } catch (error) {
        console.error('Erro no tracking de view:', error);
        return false;
    }
}

/**
 * Obter estatísticas de visualizações de um post
 */
export async function getPostViewStats(postId: string) {
    try {
        // Total de views
        const { count: totalViews } = await supabaseAdmin
            .from('news_post_views')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        // Views únicas (sessões diferentes)
        const { data: uniqueSessions } = await supabaseAdmin
            .from('news_post_views')
            .select('session_id')
            .eq('post_id', postId);

        const uniqueCount = new Set(uniqueSessions?.map(v => v.session_id)).size;

        // Views dos últimos 7 dias
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: recentViews } = await supabaseAdmin
            .from('news_post_views')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId)
            .gte('viewed_at', sevenDaysAgo.toISOString());

        return {
            total: totalViews || 0,
            unique: uniqueCount,
            last7Days: recentViews || 0
        };
    } catch (error) {
        console.error('Erro ao obter estatísticas de views:', error);
        return { total: 0, unique: 0, last7Days: 0 };
    }
}
