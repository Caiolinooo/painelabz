/**
 * API: /api/ia/models
 * GET — Listar modelos disponíveis no endpoint LM Studio
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { listModels, testConnection } from '@/lib/ia/client';

export async function GET(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const testMode = request.nextUrl.searchParams.get('test') === 'true';

    if (testMode) {
      const result = await testConnection();
      return NextResponse.json(result);
    }

    const models = await listModels();

    return NextResponse.json({
      models: models.map(m => ({
        id: m.id,
        object: m.object || 'model',
        owned_by: m.owned_by || 'local',
      })),
    });
  } catch (err) {
    console.error('[API IA Models GET]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao listar modelos' },
      { status: 500 }
    );
  }
}
