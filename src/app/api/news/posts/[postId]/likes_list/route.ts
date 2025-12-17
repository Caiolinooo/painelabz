import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ postId: string }> }
) {
    try {
        const { postId } = await params;

        const { data: likes, error } = await supabaseAdmin
            .from('news_post_likes')
            .select(`
        user_id,
        created_at,
        user:users_unified!user_id (
          id,
          first_name,
          last_name,
          avatar,
          drive_photo_url,
          role
        )
      `)
            .eq('post_id', postId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar likes:', error);
            return NextResponse.json({ error: 'Erro ao buscar likes' }, { status: 500 });
        }

        // Format response
        const formattedLikes = likes.map((like: any) => ({
            userId: like.user_id,
            firstName: like.user.first_name,
            lastName: like.user.last_name,
            avatar: like.user.avatar || like.user.drive_photo_url,
            role: like.user.role,
            likedAt: like.created_at
        }));

        return NextResponse.json({ likes: formattedLikes });

    } catch (error) {
        console.error('Erro interno:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
