
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Safely create client, or return null if keys missing (during build)
const supabase = (supabaseUrl && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        if (!supabase) {
            return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
        }

        const userId = params.id;
        const { accessPermissions } = await request.json();

        // Verify authentication/authorization (Basic check)
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        // In a real app, verify the token here using getUser() or verifyJwt()

        // Update the permissions
        const { data, error } = await supabase
            .from('users_unified')
            .update({
                access_permissions: accessPermissions,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating permissions:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ user: data });
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
