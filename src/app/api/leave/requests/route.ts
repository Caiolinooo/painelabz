import { NextResponse } from 'next/server';
import { createLeaveRequest, getUserLeaveRequests } from '@/services/leaveService';
import { supabaseAdmin } from '@/lib/supabase';
import { sendGlobalNotification } from '@/lib/global-notifications';
import { sendEmail } from '@/lib/email-service';
import { notifyLeaveRequestCreated } from '@/services/leaveNotifications';
import { extractTokenFromHeader, verifyToken, checkAclPermission } from '@/lib/auth';

function getAuthPayload(request: Request) {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) return null;
    return verifyToken(token);
}

export async function GET(request: Request) {
    try {
        const payload = getAuthPayload(request);
        if (!payload) {
            return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const hasAcl = await checkAclPermission(payload.userId, payload.role, 'ferias', 'admin') ||
                       await checkAclPermission(payload.userId, payload.role, 'ferias', 'manage') ||
                       await checkAclPermission(payload.userId, payload.role, 'ferias', 'read');

        if (payload.userId !== userId && payload.role !== 'ADMIN' && payload.role !== 'MANAGER' && !hasAcl) {
            return NextResponse.json({ error: 'Você não tem permissão para ver solicitações de outro usuário' }, { status: 403 });
        }

        const data = await getUserLeaveRequests(userId);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error GET /api/leave/requests:', error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const payload = getAuthPayload(request);
        if (!payload) {
            return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
        }

        const body = await request.json();
        const { user_id, start_date, end_date, justification, periods, pecuniary_allowance, advance_13th_salary } = body;

        if (!user_id || !start_date || !end_date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const hasAcl = await checkAclPermission(payload.userId, payload.role, 'ferias', 'admin') ||
                       await checkAclPermission(payload.userId, payload.role, 'ferias', 'manage');

        if (payload.userId !== user_id && payload.role !== 'ADMIN' && !hasAcl) {
            return NextResponse.json({ error: 'Você não tem permissão para criar solicitações para outro usuário' }, { status: 403 });
        }

        const res = await createLeaveRequest(user_id, start_date, end_date, justification, periods, pecuniary_allowance, advance_13th_salary);

        if (res.success && res.data) {
            await notifyLeaveRequestCreated(res.data.id);

            return NextResponse.json(res.data);
        } else {
            return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
        }
    } catch (error) {
        console.error('Error POST /api/leave/requests:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
