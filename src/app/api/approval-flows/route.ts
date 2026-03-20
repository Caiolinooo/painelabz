import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        let token = extractTokenFromHeader(authHeader || undefined);
        if (!token) {
            token = request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value || null;
        }
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload || !payload.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const userId = payload.userId;
        const role = payload.role?.toUpperCase() || 'USER';

        let query = supabaseAdmin
            .from('approval_flows')
            .select('*')
            .order('created_at', { ascending: false });

        // RBAC Logic
        if (role === 'ADMIN') {
            // See all - no filter
        } else if (role === 'MANAGER') {
            // See flows from their sector
            const { data: userSector } = await supabaseAdmin
                .from('users_unified')
                .select('sector_id')
                .eq('id', userId)
                .maybeSingle();

            if (userSector?.sector_id) {
                query = query.or(`approver_id.eq.${userId},request_id.in.(SELECT id FROM purchase_requests WHERE sector_id.eq.${userSector.sector_id})`);
            } else {
                query = query.eq('approver_id', userId);
            }
        } else {
            // Regular user - see only their approval steps
            query = query.eq('approver_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching approval flows:', error);
            throw error;
        }

        // Enrich with request and approver details
        const enrichedData = await Promise.all(data.map(async (flow: any) => {
            // Get request details
            const { data: request } = await supabaseAdmin
                .from('purchase_requests')
                .select('request_number, provider_name, total_value, status')
                .eq('id', flow.request_id)
                .maybeSingle();

            // Get approver name
            const { data: approver } = await supabaseAdmin
                .from('users_unified')
                .select('name')
                .eq('id', flow.approver_id)
                .maybeSingle();

            return {
                ...flow,
                request_details: request,
                approver_name: approver?.name || 'Desconhecido'
            };
        }));

        return NextResponse.json({ data: enrichedData });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        let token = extractTokenFromHeader(authHeader || undefined);
        if (!token) {
            token = request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value || null;
        }
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const body = await request.json();

        // Validate required fields
        if (!body.request_id || !body.approver_id || !body.step_number) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('approval_flows')
            .insert(body)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data, success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}