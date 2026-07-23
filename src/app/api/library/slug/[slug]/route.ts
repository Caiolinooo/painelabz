import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const slug = params.slug;

    const { data, error } = await supabaseAdmin
        .from('library_items')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
}
