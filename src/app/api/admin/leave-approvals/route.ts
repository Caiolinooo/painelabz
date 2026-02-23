import { NextResponse } from 'next/server';
import { getPendingLeaveRequestsForApprover, updateLeaveRequestStatus } from '@/services/leaveService';
import { supabaseAdmin, supabase } from '@/lib/supabase';
import { sendGlobalNotification } from '@/lib/global-notifications';

import { triggerLeaveNotifications } from '@/services/leaveNotifications';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const approverId = searchParams.get('approverId');

        if (!approverId) {
            return NextResponse.json({ error: 'Missing approverId' }, { status: 400 });
        }

        const isApproverQuery = await supabaseAdmin
            .from('leave_sector_configs')
            .select('id')
            .or(`leader_id.eq.${approverId},manager_id.eq.${approverId}`)
            .limit(1);

        const isApprover = (isApproverQuery.data && isApproverQuery.data.length > 0);

        const data = await getPendingLeaveRequestsForApprover(approverId);

        return NextResponse.json({
            isApprover,
            requests: data
        });
    } catch (error) {
        console.error('Error GET /api/admin/leave-approvals:', error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { request_id, approver_id, action, reason, force_admin } = body; // action: 'APPROVE' or 'REJECT'

        if (!request_id || !action || (!approver_id && !force_admin)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // First get the request to know its current state
        const { data: currentReq, error: reqError } = await supabaseAdmin
            .from('leave_requests')
            .select(`*, user:users_unified(sector_id)`)
            .eq('id', request_id)
            .single();

        if (reqError || !currentReq) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // And get the config for that sector to verify the approver role
        const sectorId = currentReq.user.sector_id;
        const { data: config, error: configError } = await supabaseAdmin
            .from('leave_sector_configs')
            .select('*')
            .eq('sector_id', sectorId)
            .single();

        if (configError || !config) {
            return NextResponse.json({ error: 'Sector configuration not found' }, { status: 500 });
        }

        let nextStatus: 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED' = 'APPROVED';

        if (action === 'REJECT') {
            nextStatus = 'REJECTED';
        } else if (action === 'APPROVE') {
            if (force_admin) {
                // Se for um admin forçando a aprovação, pular todas as etapas
                nextStatus = 'APPROVED';
            } else {
                if (currentReq.status === 'PENDING_LEADER') {
                    // Is this person the leader?
                    if (config.leader_id === approver_id) {
                        if (config.manager_id) {
                            nextStatus = 'PENDING_MANAGER'; // Needs manager approval now
                        } else {
                            nextStatus = 'APPROVED'; // No manager defined, auto-approve
                        }
                    } else {
                        return NextResponse.json({ error: 'Not authorized as leader' }, { status: 403 });
                    }
                } else if (currentReq.status === 'PENDING_MANAGER') {
                    if (config.manager_id === approver_id) {
                        nextStatus = 'APPROVED';
                    } else {
                        return NextResponse.json({ error: 'Not authorized as manager' }, { status: 403 });
                    }
                } else {
                    return NextResponse.json({ error: 'Invalid state transition for normal approval' }, { status: 400 });
                }
            }
        }

        const success = await updateLeaveRequestStatus(request_id, nextStatus, reason);

        if (success) {
            await triggerLeaveNotifications(request_id, nextStatus, reason);
            return NextResponse.json({ success: true, newStatus: nextStatus });
        } else {
            return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
        }
    } catch (error) {
        console.error('Error POST /api/admin/leave-approvals:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
