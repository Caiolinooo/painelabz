import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: List all modules
export async function GET(request: NextRequest) {
    const { isAdmin } = await isAdminFromRequest(request);
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const { data, error } = await supabaseAdmin
            .from('sys_modules')
            .select(`
        *,
        fields:sys_fields(*)
      `)
            .order('title');

        if (error) throw error;

        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// POST: Create a new module
export async function POST(request: NextRequest) {
    const { isAdmin } = await isAdminFromRequest(request);
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const body = await request.json();
        const { title, key, description, icon, fields } = body;

        // 1. Create Module
        const { data: moduleData, error: moduleError } = await supabaseAdmin
            .from('sys_modules')
            .insert({
                title,
                key,
                description,
                icon,
                table_name: 'sys_dynamic_records', // Default for new modules
                is_system: false
            })
            .select()
            .single();

        if (moduleError) throw moduleError;

        // 2. Create Fields
        if (fields && fields.length > 0) {
            const fieldsToInsert = fields.map((f: any, index: number) => ({
                module_id: moduleData.id,
                name: f.name,
                label: f.label,
                type: f.type,
                required: f.required || false,
                options: f.options || null,
                order: index
            }));

            const { error: fieldsError } = await supabaseAdmin
                .from('sys_fields')
                .insert(fieldsToInsert);

            if (fieldsError) throw fieldsError;
        }

        return NextResponse.json(moduleData);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
// PUT: Update an existing module
export async function PUT(request: NextRequest) {
    const { isAdmin } = await isAdminFromRequest(request);
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const body = await request.json();
        const { id, title, description, icon, fields } = body;

        if (!id) return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });

        // 1. Update Module
        const { error: moduleError } = await supabaseAdmin
            .from('sys_modules')
            .update({
                title,
                description,
                icon,
            })
            .eq('id', id);

        if (moduleError) throw moduleError;

        // 2. Manage Fields
        // Strategy: Delete all existing fields and re-create them.
        // This is destructive for Field IDs but safe for Data (JSONB uses name).
        // In a production app with FKs, we would use upsert.

        // First, delete existing fields
        const { error: deleteError } = await supabaseAdmin
            .from('sys_fields')
            .delete()
            .eq('module_id', id);

        if (deleteError) throw deleteError;

        // Then insert new fields
        if (fields && fields.length > 0) {
            const fieldsToInsert = fields.map((f: any, index: number) => ({
                module_id: id,
                name: f.name,
                label: f.label,
                type: f.type,
                required: f.required || false,
                options: f.options || null,
                order: index,
                is_list_visible: f.is_list_visible !== false // Default true
            }));

            const { error: fieldsError } = await supabaseAdmin
                .from('sys_fields')
                .insert(fieldsToInsert);

            if (fieldsError) throw fieldsError;
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// DELETE: Delete a module
export async function DELETE(request: NextRequest) {
    const { isAdmin } = await isAdminFromRequest(request);
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        // 1. Check if system module
        const { data: moduleData } = await supabaseAdmin
            .from('sys_modules')
            .select('is_system')
            .eq('id', id)
            .single();

        if (moduleData?.is_system) {
            return NextResponse.json({ error: 'Cannot delete system modules' }, { status: 400 });
        }

        // 2. Delete Module (Cascade should handle fields, but let's be safe)
        // Note: We might want to delete data too? 
        // For now, let's just delete the definition.
        const { error } = await supabaseAdmin
            .from('sys_modules')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
