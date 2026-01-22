import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tracking/module-access
 * Track when a user accesses a module/card from the dashboard
 * Uses sendBeacon so handles both JSON and text/plain content types
 */
export async function POST(request: NextRequest) {
    try {
        let body;
        try {
            const text = await request.text();
            body = JSON.parse(text);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const {
            module_id,
            module_name,
            module_href,
            user_id,
            user_email,
            access_type = 'click',
            is_external = false,
            session_id,
            referrer
        } = body;

        if (!module_id || !module_name) {
            return NextResponse.json({ error: 'module_id and module_name required' }, { status: 400 });
        }

        console.log(`📊 Module Access: ${module_name} (${module_id}) by user ${user_id || 'anonymous'}`);

        // Get user agent from request headers
        const userAgent = request.headers.get('user-agent') || undefined;

        // Insert access record
        const { error } = await supabaseAdmin
            .from('module_access')
            .insert({
                module_id,
                module_name,
                module_href,
                user_id: user_id || null,
                user_email: user_email || null,
                access_type,
                is_external,
                session_id,
                user_agent: userAgent,
                referrer,
                accessed_at: new Date().toISOString()
            });

        if (error) {
            // If table doesn't exist, log but don't fail
            if (error.code === '42P01') {
                console.warn('module_access table does not exist yet. Run the migration.');
                return NextResponse.json({ success: false, warning: 'Table not created yet' });
            }
            console.error('Error inserting module access:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Module tracking error:', error);
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}

/**
 * PATCH /api/tracking/module-access
 * Update duration for an existing access record (called when leaving the module)
 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { module_id, user_id, session_id, duration_seconds } = body;

        if (!module_id || !duration_seconds) {
            return NextResponse.json({ error: 'module_id and duration_seconds required' }, { status: 400 });
        }

        // First, find the most recent access record for this module/user
        const { data: recentAccess, error: selectError } = await supabaseAdmin
            .from('module_access')
            .select('id')
            .eq('module_id', module_id)
            .eq('user_id', user_id)
            .gte('accessed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('accessed_at', { ascending: false })
            .limit(1)
            .single();

        if (selectError || !recentAccess) {
            // No record found to update - this is not an error, just skip
            return NextResponse.json({ success: true, message: 'No record to update' });
        }

        // Update only the specific record by ID
        const { error } = await supabaseAdmin
            .from('module_access')
            .update({ duration_seconds })
            .eq('id', recentAccess.id);

        if (error) {
            console.error('Error updating module duration:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Module duration update error:', error);
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}
