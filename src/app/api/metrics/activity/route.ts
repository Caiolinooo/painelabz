import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// POST - Registrar atividade do usuário (Heartbeat)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Upsert na tabela user_activity
        const { error } = await supabaseAdmin
            .from('user_activity')
            .upsert({
                user_id: userId,
                last_active_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) {
            console.error('Erro ao registrar heartbeart de atividade:', error);
            // Não falhar request, tracking é secundário
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        // console.error('Erro tracker:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
