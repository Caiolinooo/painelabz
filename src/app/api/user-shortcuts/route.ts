import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user-shortcuts
 * Get all shortcuts for the current user
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

        // Fetch user shortcuts
        const { data: shortcuts, error } = await supabaseAdmin
            .from('user_shortcuts')
            .select('*')
            .eq('user_id', userId)
            .order('position', { ascending: true });

        if (error) {
            // If table doesn't exist, return empty array
            if (error.code === '42P01') {
                console.warn('user_shortcuts table does not exist yet. Run the migration.');
                return NextResponse.json([]);
            }
            console.error('Error fetching shortcuts:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(shortcuts || []);

    } catch (error) {
        console.error('Error in GET /api/user-shortcuts:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/user-shortcuts
 * Add a new shortcut for the current user
 */
export async function POST(request: NextRequest) {
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
        const userEmail = decoded.email;

        const body = await request.json();
        const { module_id, module_name, module_href, icon } = body;

        if (!module_id || !module_name || !module_href) {
            return NextResponse.json(
                { error: 'module_id, module_name, and module_href are required' },
                { status: 400 }
            );
        }

        // Get the next position
        const { data: existing } = await supabaseAdmin
            .from('user_shortcuts')
            .select('position')
            .eq('user_id', userId)
            .order('position', { ascending: false })
            .limit(1);

        const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

        // Insert the new shortcut
        const { data: shortcut, error } = await supabaseAdmin
            .from('user_shortcuts')
            .insert({
                user_id: userId,
                user_email: userEmail,
                module_id,
                module_name,
                module_href,
                icon,
                position: nextPosition
            })
            .select()
            .single();

        if (error) {
            // Handle duplicate constraint error
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'Shortcut already exists for this module' },
                    { status: 409 }
                );
            }
            console.error('Error creating shortcut:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(shortcut, { status: 201 });

    } catch (error) {
        console.error('Error in POST /api/user-shortcuts:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/user-shortcuts
 * Remove a shortcut for the current user
 */
export async function DELETE(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const shortcutId = searchParams.get('id');
        const moduleId = searchParams.get('module_id');

        if (!shortcutId && !moduleId) {
            return NextResponse.json(
                { error: 'Either id or module_id is required' },
                { status: 400 }
            );
        }

        let query = supabaseAdmin
            .from('user_shortcuts')
            .delete()
            .eq('user_id', userId);

        if (shortcutId) {
            query = query.eq('id', shortcutId);
        } else if (moduleId) {
            query = query.eq('module_id', moduleId);
        }

        const { error } = await query;

        if (error) {
            console.error('Error deleting shortcut:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error in DELETE /api/user-shortcuts:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
