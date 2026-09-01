import { NextRequest, NextResponse } from 'next/server';
import {
  decidirAgendamento,
  loadAtorFromUserId,
} from '@/lib/gestao-tripulantes/aso-agendamento-service';
import {
  clientIpFromRequest,
  isLogisticaRole,
  requireAsoAgendamentoAuth,
  resolveAuthUserId,
} from '@/lib/gestao-tripulantes/aso-agendamento-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = requireAsoAgendamentoAuth(request);
    if (auth.error) return auth.error;
    if (!isLogisticaRole(auth.payload?.role)) {
      return NextResponse.json(
        { error: 'Apenas logística (ADMIN/MANAGER) pode reprovar agendamento de ASO.' },
        { status: 403 },
      );
    }
    const userId = resolveAuthUserId(auth.payload!);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const motivo = String(body.motivo || body.motivo_reprovacao || '').trim();
    if (!motivo) {
      return NextResponse.json({ error: 'Informe o motivo da reprovação' }, { status: 400 });
    }
    const ator = await loadAtorFromUserId(userId);
    const data = await decidirAgendamento({
      id,
      acao: 'reprovar',
      motivo,
      signatureUrl: body.signature_url || body.assinatura_url || ator.signatureUrl,
      ator,
      ip: clientIpFromRequest(request),
    });
    return NextResponse.json({
      success: true,
      data,
      message: 'Solicitação reprovada. O DP foi notificado com o motivo.',
    });
  } catch (error) {
    console.error('[ASO agendamento reprovar]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao reprovar agendamento' },
      { status: 500 },
    );
  }
}
