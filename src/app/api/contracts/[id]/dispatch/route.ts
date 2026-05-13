import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { dispatchEnvelopeStage } from '@/lib/envelopeDispatcher';
import { authenticateUser } from '@/lib/api-auth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error: authError } = await authenticateUser(request);
        if (authError) return authError;
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

        // Verify role can manage contracts
        const role = (user.role || '').toUpperCase();
        if (role !== 'ADMIN' && role !== 'MANAGER') {
            return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
        }

        const { id: envelopeId } = await params;

        if (!envelopeId) {
            return NextResponse.json({ error: 'Envelope ID não fornecido' }, { status: 400 });
        }

        // 1. Verify envelope existence and that user owns it or is admin
        const { data: envelope, error: findError } = await supabaseAdmin
            .from('envelopes')
            .select('id, titulo, status')
            .eq('id', envelopeId)
            .single();

        if (findError || !envelope) {
            return NextResponse.json({ error: 'Envelope não encontrado' }, { status: 404 });
        }

        // 2. Trigger first dispatch stage logic
        const result = await dispatchEnvelopeStage(envelopeId);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Fluxo de assinaturas iniciado com sucesso!',
            details: result
        });

    } catch (error) {
        console.error('Erro em POST /api/contracts/[id]/dispatch:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
