/**
 * API: /api/ia/dashboard
 * GET — Dados do dashboard inteligente com KPIs, pendências e resumo
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { generateDashboard } from '@/lib/ia/dashboard-service';

export async function GET(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;
    const role = tokenResult.payload.role;
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true';

    const result = await generateDashboard(userId, role, forceRefresh);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API IA Dashboard GET]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
