import { supabase, supabaseAdmin } from '@/lib/db';

export interface LeaveSectorConfig {
    id: string;
    sector_id: string;
    leader_id: string | null;
    manager_id: string | null;
    created_at: string;
    updated_at: string;
    // Joins
    sector?: { id: string; name: string };
    leader?: { id: string; name: string; email: string };
    manager?: { id: string; name: string; email: string };
}

export interface LeaveRequest {
    id: string;
    user_id: string;
    start_date: string;
    end_date: string;
    periods?: Array<{ start_date: string; end_date: string; duration: number }>;
    status: 'PENDING_LEADER' | 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    justification?: string;
    rejection_reason?: string;
    pecuniary_allowance?: boolean;
    created_at: string;
    updated_at: string;
    // Joins
    user?: { id: string; name: string; email: string; sector_id: string; sector?: { name: string } };
}

// ==========================================
// SECTOR CONFIGS
// ==========================================

export async function getLeaveSectorConfigs(): Promise<LeaveSectorConfig[]> {
    const { data, error } = await supabaseAdmin
        .from('leave_sector_configs')
        .select(`
      *,
      sector:sectors(id, name),
      leader:users_unified!leave_sector_configs_leader_id_fkey(id, name, email),
      manager:users_unified!leave_sector_configs_manager_id_fkey(id, name, email)
    `);

    if (error) {
        console.error('Error fetching leave sector configs:', error);
        return [];
    }

    return data as LeaveSectorConfig[];
}

export async function getLeaveConfigForSector(sectorId: string): Promise<LeaveSectorConfig | null> {
    const { data, error } = await supabaseAdmin
        .from('leave_sector_configs')
        .select(`
      *,
      sector:sectors(id, name),
      leader:users_unified!leave_sector_configs_leader_id_fkey(id, name, email),
      manager:users_unified!leave_sector_configs_manager_id_fkey(id, name, email)
    `)
        .eq('sector_id', sectorId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error(`Error fetching leave config for sector ${sectorId}:`, error);
        return null;
    }

    return data as LeaveSectorConfig | null;
}

export async function upsertLeaveSectorConfig(sectorId: string, leaderId: string | null, managerId: string | null): Promise<boolean> {
    // Check if exists
    const existing = await getLeaveConfigForSector(sectorId);

    if (existing) {
        const { error } = await supabaseAdmin
            .from('leave_sector_configs')
            .update({ leader_id: leaderId, manager_id: managerId })
            .eq('sector_id', sectorId);

        if (error) {
            console.error(`Error updating leave config for sector ${sectorId}:`, error);
            return false;
        }
    } else {
        const { error } = await supabaseAdmin
            .from('leave_sector_configs')
            .insert([{ sector_id: sectorId, leader_id: leaderId, manager_id: managerId }]);

        if (error) {
            console.error(`Error creating leave config for sector ${sectorId}:`, error);
            return false;
        }
    }

    return true;
}

// ==========================================
// LEAVE REQUESTS
// ==========================================

export async function getUserLeaveRequests(userId: string): Promise<LeaveRequest[]> {
    const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .select(`
      *,
      user:users_unified(id, name, email, sector_id)
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(`Error fetching leave requests for user ${userId}:`, error);
        return [];
    }

    return data as LeaveRequest[];
}

export async function getPendingLeaveRequestsForApprover(approverId: string): Promise<LeaveRequest[]> {
    // Busca configs onde o approverId é líder ou gerente
    const { data: configs, error: configError } = await supabaseAdmin
        .from('leave_sector_configs')
        .select('*')
        .or(`leader_id.eq.${approverId},manager_id.eq.${approverId}`);

    if (configError) {
        console.error('Error fetching configs for approver:', configError);
        return [];
    }

    if (!configs || configs.length === 0) {
        return []; // Not an approver for any sector
    }

    const sectorIdsWhereLeader = configs.filter(c => c.leader_id === approverId).map(c => c.sector_id);
    const sectorIdsWhereManager = configs.filter(c => c.manager_id === approverId).map(c => c.sector_id);

    // Precisamos buscar as requests dos usuários que pertencem a esses setores
    // E filtrar pelo status apropriado

    // As we can't easily join and filter in a single Supabase query with complex ORs and related tables,
    // we'll fetch potentially relevant ones and filter in memory, or use a broad query.
    // However, the cleanest way is a raw supabase query if we have the view, but let's do it via REST.

    // Get all requests that are pending leader OR pending manager
    const { data: requests, error: reqError } = await supabaseAdmin
        .from('leave_requests')
        .select(`
            *,
            user:users_unified!inner(id, name, email, sector_id)
        `)
        .in('status', ['PENDING_LEADER', 'PENDING_MANAGER'])
        .order('created_at', { ascending: false });

    if (reqError) {
        console.error('Error fetching pending requests:', reqError);
        return [];
    }

    // Now filter based on approver role per sector
    const filteredRequests = (requests as any[]).filter(req => {
        // Prevent users from approving their own request
        if (req.user_id === approverId) return false;

        const userSectorId = req.user.sector_id;

        if (req.status === 'PENDING_LEADER' && sectorIdsWhereLeader.includes(userSectorId)) {
            return true;
        }

        if (req.status === 'PENDING_MANAGER' && sectorIdsWhereManager.includes(userSectorId)) {
            return true;
        }

        return false;
    });

    return filteredRequests as LeaveRequest[];
}

export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
    const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .select(`
      *,
      user:users_unified(id, name, email, sector_id)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all leave requests:', error);
        return [];
    }

    return data as LeaveRequest[];
}

export async function createLeaveRequest(
    userId: string,
    startDate: string,
    endDate: string,
    justification?: string,
    periods?: Array<{ start_date: string; end_date: string; duration: number }>,
    pecuniaryAllowance?: boolean
): Promise<{ success: boolean; data?: LeaveRequest; error?: any }> {
    // 1. Get user and config to determine initial status
    const { data: user } = await supabaseAdmin.from('users_unified').select('sector_id').eq('id', userId).single();
    let initialStatus = 'PENDING_LEADER';
    let isManager = false;

    if (user?.sector_id) {
        const { data: config } = await supabaseAdmin.from('leave_sector_configs').select('leader_id, manager_id').eq('sector_id', user.sector_id).single();
        if (config) {
            if (config.manager_id === userId) {
                // Manager requesting: bypass both leader and manager. Assuming Admin will handle or auto-approve.
                initialStatus = 'APPROVED'; // Could also be PENDING_ADMIN if added later.
                isManager = true;
            } else if (config.leader_id === userId) {
                // Leader requesting: bypass leader approval, go straight to manager
                initialStatus = 'PENDING_MANAGER';
            } else if (!config.leader_id) {
                // No leader defined: go straight to manager
                initialStatus = 'PENDING_MANAGER';
            }
        } else {
            initialStatus = 'PENDING_MANAGER'; // No config at all
        }
    } else {
        initialStatus = 'PENDING_MANAGER'; // No sector at all
    }

    const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .insert([{
            user_id: userId,
            start_date: startDate,
            end_date: endDate,
            periods: periods || [],
            status: initialStatus,
            justification,
            pecuniary_allowance: pecuniaryAllowance || false
        }])
        .select()
        .single();

    if (error) {
        console.error('Error creating leave request:', error);
        return { success: false, error };
    }

    return { success: true, data: data as LeaveRequest };
}

export async function updateLeaveRequestStatus(
    requestId: string,
    status: 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
    rejectionReason?: string
): Promise<boolean> {
    const updateData: any = { status };
    if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
    }

    const { error } = await supabaseAdmin
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId);

    if (error) {
        console.error(`Error updating leave request ${requestId} to ${status}:`, error);
        return false;
    }

    return true;
}
