import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { guardDebugRoute } from '@/lib/debug-route-guard';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to verify is_lider column data
 * GET /api/debug/lideres
 */
export async function GET(request: NextRequest) {
    const blocked = await guardDebugRoute(request);
    if (blocked) return blocked;

    try {
        // Get all users marked as leaders
        const { data: lideres, error: lideresError } = await supabaseAdmin
            .from('users_unified')
            .select('id, first_name, last_name, email, is_lider, position, department')
            .eq('is_lider', true)
            .order('first_name');

        if (lideresError) {
            console.error('Error fetching lideres:', lideresError);
            return NextResponse.json({
                success: false,
                error: lideresError.message,
                hint: 'The is_lider column might not exist or have wrong type'
            }, { status: 500 });
        }

        // Also get a sample of users to check is_lider values
        const { data: sampleUsers, error: sampleError } = await supabaseAdmin
            .from('users_unified')
            .select('id, first_name, last_name, is_lider')
            .limit(10);

        // Check column info
        const { data: columnInfo, error: columnError } = await supabaseAdmin
            .rpc('get_column_info', { table_name: 'users_unified', column_name: 'is_lider' })
            .single();

        return NextResponse.json({
            success: true,
            lideresCount: lideres?.length || 0,
            lideres: lideres || [],
            sampleUsers: sampleUsers?.map(u => ({
                id: u.id,
                name: `${u.first_name} ${u.last_name}`,
                is_lider: u.is_lider,
                is_lider_type: typeof u.is_lider
            })),
            columnInfo: columnInfo || 'RPC not available',
            message: lideres && lideres.length > 0
                ? `Found ${lideres.length} users marked as leaders`
                : 'No users found with is_lider = true'
        });
    } catch (error: any) {
        console.error('Debug endpoint error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
