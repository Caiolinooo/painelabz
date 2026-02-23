import { NextResponse } from 'next/server';
import { createLeaveRequest, getUserLeaveRequests } from '@/services/leaveService';
import { supabaseAdmin } from '@/lib/supabase';
import { sendGlobalNotification } from '@/lib/global-notifications';
import { sendEmail } from '@/lib/email-service';
import { notifyLeaveRequestCreated } from '@/services/leaveNotifications';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
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
        const body = await request.json();
        const { user_id, start_date, end_date, justification, periods } = body;

        if (!user_id || !start_date || !end_date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const res = await createLeaveRequest(user_id, start_date, end_date, justification, periods);

        if (res.success && res.data) {
            // Trigger generic notification service
            // NOTIFY HR, APPROVERS AND REQUESTER ABOUT THE NEW LEAVE REQUEST
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
