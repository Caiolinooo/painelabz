import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { NotificacoesAvaliacaoService } from '@/lib/services/notificacoes-avaliacao';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { periodoId, periodoNome, dataLimite } = body;

        if (!periodoId || !periodoNome || !dataLimite) {
            return NextResponse.json(
                { success: false, error: 'Parâmetros incompletos' },
                { status: 400 }
            );
        }

        // Call the service on the server-side to avoid pulling native Node modules into client bundles
        await NotificacoesAvaliacaoService.notificarInicioPeriodo(
            periodoId,
            periodoNome,
            dataLimite
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Erro em POST /api/avaliacao/notificar-inicio-periodo:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
