import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const search = searchParams.get('search') || '';

        let query = supabaseAdmin
            .from('leave_requests')
            .select(`
                *,
                user:users_unified(name, email, sector_id),
                sector:sectors(name)
            `, { count: 'exact' });

        if (status && status !== 'ALL') {
            query = query.eq('status', status);
        }

        query = query.order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, count, error } = await query;

        if (error) {
            console.error('Error fetching global leave requests:', error);
            throw error;
        }

        // Apply in-memory search filter if passed (since we are using relations, standard ILIKE is tricky in supabase sometimes across tables)
        let processedData = data || [];
        if (search) {
            const lowerSearch = search.toLowerCase();
            processedData = processedData.filter((req: any) =>
                (req.user?.name && req.user.name.toLowerCase().includes(lowerSearch)) ||
                (req.sector?.name && req.sector.name.toLowerCase().includes(lowerSearch))
            );
        }

        return NextResponse.json({
            requests: processedData,
            totalCount: count || 0
        });

    } catch (error) {
        console.error('Error in GET /api/admin/leave-requests:', error);
        return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
    }
}
