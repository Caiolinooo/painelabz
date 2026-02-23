import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 50;

        let query = supabaseAdmin
            .from('suppliers')
            .select('*')
            .order('sequential_id', { ascending: true });

        if (search) {
            query = query.or(`trade_name.ilike.%${search}%,legal_name.ilike.%${search}%,document_number.ilike.%${search}%`);
        }

        if (limit) {
            query = query.limit(limit);
        }

        const { data: suppliers, error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true, data: suppliers });
    } catch (error: any) {
        console.error('API /suppliers GET error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        const { data: supplier, error } = await supabaseAdmin
            .from('suppliers')
            .insert(data)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: supplier });
    } catch (error: any) {
        console.error('API /suppliers POST error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const data = await request.json();
        const { id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
        }

        updateData.updated_at = new Date().toISOString();

        const { data: supplier, error } = await supabaseAdmin
            .from('suppliers')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: supplier });
    } catch (error: any) {
        console.error('API /suppliers PUT error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('suppliers')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API /suppliers DELETE error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
