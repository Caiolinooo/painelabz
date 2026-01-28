import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/sectors - Returns all sectors for dropdown population
export async function GET(request: NextRequest) {
    try {
        const { data: sectors, error } = await supabaseAdmin
            .from('sectors')
            .select('id, name, allowed_modules, allowed_cards')
            .order('name');

        if (error) {
            console.error('Error fetching sectors:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(sectors || []);
    } catch (error: any) {
        console.error('Unexpected error fetching sectors:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
