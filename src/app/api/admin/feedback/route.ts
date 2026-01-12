import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET - List all feedbacks with user info
export async function GET(request: NextRequest) {
    try {
        // Verify admin/manager token
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            const token = authHeader.split(' ')[1];
            const { verifyToken } = await import('@/lib/auth');
            const decoded = verifyToken(token);

            if (!decoded || typeof decoded !== 'object') {
                return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
            }

            const userId = (decoded as any).userId;

            // Check if user is admin/manager
            const { data: user } = await supabaseAdmin
                .from('users_unified')
                .select('role')
                .eq('id', userId)
                .single();

            if (!user || !['ADMIN', 'MANAGER', 'SUPPORT'].includes(user.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        } catch (e) {
            console.error('Auth error:', e);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch feedbacks with all enhanced fields
        const { data: feedbacks, error } = await supabaseAdmin
            .from('user_feedback')
            .select(`
                id,
                user_id,
                type,
                message,
                url,
                user_agent,
                screen_resolution,
                status,
                created_at,
                updated_at,
                user_name,
                user_email,
                console_logs,
                browser_info,
                screenshot_url,
                attachments
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching feedbacks:', error);
            return NextResponse.json({ error: 'Failed to fetch feedbacks' }, { status: 500 });
        }

        // If user_name/user_email are not in DB, try to get from users_unified
        const feedbacksToUpdate = (feedbacks || []).filter(f => f.user_id && !f.user_name);

        if (feedbacksToUpdate.length > 0) {
            const userIds = [...new Set(feedbacksToUpdate.map(f => f.user_id))];
            const { data: users } = await supabaseAdmin
                .from('users_unified')
                .select('id, name, email')
                .in('id', userIds);

            if (users) {
                const userMap = users.reduce((acc, u) => {
                    acc[u.id] = { name: u.name || '', email: u.email || '' };
                    return acc;
                }, {} as Record<string, { name: string; email: string }>);

                // Merge user info
                feedbacks?.forEach(fb => {
                    if (fb.user_id && !fb.user_name && userMap[fb.user_id]) {
                        fb.user_name = userMap[fb.user_id].name;
                        fb.user_email = userMap[fb.user_id].email;
                    }
                });
            }
        }

        return NextResponse.json({ feedbacks: feedbacks || [] });

    } catch (error) {
        console.error('API Admin Feedback Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
