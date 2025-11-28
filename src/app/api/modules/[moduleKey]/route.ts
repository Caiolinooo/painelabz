import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper to validate user permissions
async function validatePermissions(request: NextRequest, moduleKey: string, action: 'read' | 'write') {
    const authHeader = request.headers.get('authorization') || '';
    const token = extractTokenFromHeader(authHeader);

    if (!token) return { authorized: false, error: 'Unauthorized' };

    try {
        const payload = verifyToken(token);
        if (!payload) return { authorized: false, error: 'Invalid token' };

        // Fetch module permissions
        const { data: moduleData, error } = await supabaseAdmin
            .from('sys_modules')
            .select('permissions, is_system')
            .eq('key', moduleKey)
            .single();

        if (error || !moduleData) return { authorized: false, error: 'Module not found' };

        // Check permissions
        // This is a simplified check. In a real scenario, you'd check the user's role against the allowed roles.
        // For now, we assume if you have a valid token, you are at least a 'user'.
        // We should fetch the user's role from the DB to be sure.

        const { data: user } = await supabaseAdmin
            .from('users_unified')
            .select('role')
            .eq('id', payload.userId)
            .single();

        const userRole = user?.role?.toLowerCase() || 'user';
        const allowedRoles = moduleData.permissions?.[action] || [];

        if (allowedRoles.includes(userRole) || allowedRoles.includes('*')) {
            return { authorized: true, module: moduleData };
        }

        return { authorized: false, error: 'Insufficient permissions' };
    } catch (e) {
        return { authorized: false, error: 'Auth error' };
    }
}

// GET: List records or get a single record
export async function GET(request: NextRequest, { params }: { params: { moduleKey: string } }) {
    const { moduleKey } = params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { authorized, error, module } = await validatePermissions(request, moduleKey, 'read');
    if (!authorized) return NextResponse.json({ error }, { status: 403 });

    try {
        // Determine table name
        // If it's a system module, it might use a specific table.
        // If it's a dynamic module, it uses sys_dynamic_records.

        let query;

        if (module.table_name && module.table_name !== 'sys_dynamic_records') {
            // System module with dedicated table
            query = supabaseAdmin.from(module.table_name).select('*');
            if (id) query = query.eq('id', id).single();
        } else {
            // Dynamic module
            // We need to join with sys_modules to ensure we only get records for this module
            const { data: moduleInfo } = await supabaseAdmin.from('sys_modules').select('id').eq('key', moduleKey).single();

            query = supabaseAdmin
                .from('sys_dynamic_records')
                .select('*')
                .eq('module_id', moduleInfo.id);

            if (id) query = query.eq('id', id).single();
        }

        const { data, error: dbError } = await query;

        if (dbError) throw dbError;

        return NextResponse.json(data);
    } catch (e) {
        console.error('Error fetching module data:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Create a record
export async function POST(request: NextRequest, { params }: { params: { moduleKey: string } }) {
    const { moduleKey } = params;
    const body = await request.json();

    const { authorized, error, module } = await validatePermissions(request, moduleKey, 'write');
    if (!authorized) return NextResponse.json({ error }, { status: 403 });

    try {
        let result;

        if (module.table_name && module.table_name !== 'sys_dynamic_records') {
            // System module
            const { data, error: dbError } = await supabaseAdmin
                .from(module.table_name)
                .insert(body)
                .select()
                .single();
            if (dbError) throw dbError;
            result = data;
        } else {
            // Dynamic module
            const { data: moduleInfo } = await supabaseAdmin.from('sys_modules').select('id').eq('key', moduleKey).single();

            const { data, error: dbError } = await supabaseAdmin
                .from('sys_dynamic_records')
                .insert({
                    module_id: moduleInfo.id,
                    data: body,
                    // created_by: userId // We should extract userId from token
                })
                .select()
                .single();
            if (dbError) throw dbError;
            result = data;
        }

        return NextResponse.json(result);
    } catch (e) {
        console.error('Error creating record:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT: Update a record
export async function PUT(request: NextRequest, { params }: { params: { moduleKey: string } }) {
    const { moduleKey } = params;
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });

    const { authorized, error, module } = await validatePermissions(request, moduleKey, 'write');
    if (!authorized) return NextResponse.json({ error }, { status: 403 });

    try {
        let result;

        if (module.table_name && module.table_name !== 'sys_dynamic_records') {
            // System module
            const { data, error: dbError } = await supabaseAdmin
                .from(module.table_name)
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            if (dbError) throw dbError;
            result = data;
        } else {
            // Dynamic module
            // For dynamic records, we update the 'data' column
            // We assume 'updateData' contains the fields to update inside the JSONB
            // Supabase/Postgres JSONB update merges by default if we use the right operator, 
            // but supabase-js .update() replaces the column value. 
            // So we might need to fetch, merge, and save, OR use a raw query.
            // For simplicity in this MVP, we'll replace the data or assume the client sends the full object.
            // Better approach: Client sends full object.

            const { data, error: dbError } = await supabaseAdmin
                .from('sys_dynamic_records')
                .update({
                    data: updateData
                })
                .eq('id', id)
                .select()
                .single();
            if (dbError) throw dbError;
            result = data;
        }

        return NextResponse.json(result);
    } catch (e) {
        console.error('Error updating record:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE: Delete a record
export async function DELETE(request: NextRequest, { params }: { params: { moduleKey: string } }) {
    const { moduleKey } = params;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });

    const { authorized, error, module } = await validatePermissions(request, moduleKey, 'write');
    if (!authorized) return NextResponse.json({ error }, { status: 403 });

    try {
        if (module.table_name && module.table_name !== 'sys_dynamic_records') {
            // System module
            const { error: dbError } = await supabaseAdmin
                .from(module.table_name)
                .delete()
                .eq('id', id);
            if (dbError) throw dbError;
        } else {
            // Dynamic module
            const { error: dbError } = await supabaseAdmin
                .from('sys_dynamic_records')
                .delete()
                .eq('id', id);
            if (dbError) throw dbError;
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Error deleting record:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
