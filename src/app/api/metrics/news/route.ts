import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withPermission } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export const GET = withPermission('admin', async (request: NextRequest) => {
    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Buscar posts
        // Idealmente faria um join complexo, mas por simplicidade e MVP:
        // Buscamos posts recentes e suas métricas agregadas

        const { data: posts, error } = await supabaseAdmin
            .from('news_posts') // ou 'news' dependendo da tabela correta
            .select(`
                id, 
                title, 
                category:category_id(name), 
                published_at, 
                views_count,
                likes_count
            `)
            .gte('published_at', startDate.toISOString())
            .order('published_at', { ascending: false });

        if (error) throw error;

        // Agora enriquecer com dados da tabela de views detalhada (unique visits e tempo)
        // Isso pode ser pesado se tiver muitos posts, o ideal é criar uma View Materializada ou indexar bem

        const enriched = await Promise.all(posts.map(async (post: any) => {
            // Stats de views
            const { data: viewStats } = await supabaseAdmin.rpc('get_post_stats', { p_post_id: post.id });

            // Fallback manual se RPC não existir
            let uniqueViews = post.views_count;
            let avgTime = 0;

            if (!viewStats) {
                // Query manual (lenta n+1, mas ok para < 100 posts)
                const { data: views, error: viewsError } = await supabaseAdmin
                    .from('news_post_views')
                    .select('duration_seconds, user_id')
                    .eq('post_id', post.id);

                console.log(`📊 Post ${post.id} views:`, views?.length || 0, 'Error:', viewsError?.message);

                if (views && views.length > 0) {
                    const uniqueUserIds = new Set(views.map((v: any) => v.user_id).filter(Boolean));
                    uniqueViews = uniqueUserIds.size || views.length;

                    // Only count views with duration > 0 for average calculation
                    const viewsWithTime = views.filter((v: any) => v.duration_seconds && v.duration_seconds > 0);
                    const totalTime = viewsWithTime.reduce((acc: number, curr: any) => acc + curr.duration_seconds, 0);
                    avgTime = viewsWithTime.length > 0 ? totalTime / viewsWithTime.length : 0;
                    console.log(`⏱️ Post ${post.id}: ${viewsWithTime.length} views with time, total: ${totalTime}s, avg: ${avgTime.toFixed(1)}s`);
                }
            } else {
                // Se tivesse RPC..
            }

            return {
                id: post.id,
                title: post.title,
                category: post.category?.name || 'Geral',
                published_at: post.published_at,
                views_total: post.views_count || 0,
                views_unique: uniqueViews || 0,
                avg_time_seconds: avgTime || 0,
                likes: post.likes_count || 0,
                comments: 0 // TODO
            };
        }));

        return NextResponse.json(enriched);

    } catch (e: any) {
        console.error('Metrics API Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
});
