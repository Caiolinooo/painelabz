import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user-shortcuts/suggestions
 * Get module suggestions based on user's access history
 */
export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const authHeader = request.headers.get('authorization');
        const token = extractTokenFromHeader(authHeader || undefined);

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = await verifyToken(token);
        if (!decoded || !decoded.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decoded.userId;

        // Get existing shortcuts to exclude them from suggestions
        const { data: existingShortcuts } = await supabaseAdmin
            .from('user_shortcuts')
            .select('module_id')
            .eq('user_id', userId);

        const existingModuleIds = (existingShortcuts || []).map(s => s.module_id);

        // Get top accessed modules for this user
        const { data: accessData, error: accessError } = await supabaseAdmin
            .from('module_access')
            .select('module_id, module_name, module_href')
            .eq('user_id', userId)
            .not('module_id', 'in', existingModuleIds.length > 0 ? `(${existingModuleIds.join(',')})` : '()')
            .order('accessed_at', { ascending: false });

        if (accessError) {
            // If table doesn't exist, return empty suggestions
            if (accessError.code === '42P01') {
                console.warn('module_access table does not exist yet.');
                return NextResponse.json({ suggestions: [], message: 'No access data available' });
            }
            console.error('Error fetching access data:', accessError);
        }

        // Count accesses per module and get top 5
        const moduleCounts: Record<string, { count: number; name: string; href: string }> = {};

        (accessData || []).forEach((access) => {
            if (!moduleCounts[access.module_id]) {
                moduleCounts[access.module_id] = {
                    count: 0,
                    name: access.module_name,
                    href: access.module_href || ''
                };
            }
            moduleCounts[access.module_id].count++;
        });

        // Filter out existing shortcuts and sort by count
        const suggestions = Object.entries(moduleCounts)
            .filter(([moduleId]) => !existingModuleIds.includes(moduleId))
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([moduleId, data]) => ({
                module_id: moduleId,
                module_name: data.name,
                module_href: data.href,
                access_count: data.count
            }));

        return NextResponse.json({
            suggestions,
            message: suggestions.length > 0
                ? 'Based on your recent activity'
                : 'No suggestions available'
        });

    } catch (error) {
        console.error('Error in GET /api/user-shortcuts/suggestions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
