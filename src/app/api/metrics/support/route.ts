import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withPermission } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// POST - Criar novo relatório de Dúvidas/Suporte
export const POST = withPermission('admin', async (request: NextRequest) => {
    try {
        const body = await request.json();
        const { department, volume_estimated, top_doubts, period_start, period_end } = body;

        // Validação básica
        if (!department || !top_doubts) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('support_metrics')
            .insert({
                department,
                volume_estimated: volume_estimated || 0,
                top_doubts,
                period_start: period_start || new Date().toISOString(),
                period_end: period_end || new Date().toISOString(),
                created_by: null // Será pego do token se necessário, mas o admin client já bypass RLS se usado corretamente ou auth users se nao
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving support metrics:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error endpoint support metrics:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
});

// GET - Listar relatórios
export const GET = withPermission('admin', async (request: NextRequest) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('support_metrics')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
});
