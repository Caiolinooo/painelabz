import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Helper to verify admin
async function verifyAdmin(request: NextRequest): Promise<{ userId: string } | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;

    try {
        const token = authHeader.split(' ')[1];
        const { verifyToken } = await import('@/lib/auth');
        const decoded = verifyToken(token);

        if (!decoded || typeof decoded !== 'object') return null;

        const userId = (decoded as any).userId;

        const { data: user } = await supabaseAdmin
            .from('users_unified')
            .select('role')
            .eq('id', userId)
            .single();

        if (!user || !['ADMIN', 'MANAGER', 'SUPPORT'].includes(user.role)) {
            return null;
        }

        return { userId };
    } catch {
        return null;
    }
}

// PATCH - Update feedback status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        if (!status || !['open', 'in_progress', 'resolved', 'dismissed'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('user_feedback')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating feedback:', error);
            return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Admin Feedback PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE - Delete feedback
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const { error } = await supabaseAdmin
            .from('user_feedback')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting feedback:', error);
            return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Admin Feedback DELETE Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
