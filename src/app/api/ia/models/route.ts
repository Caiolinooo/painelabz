/**
 * API: /api/ia/models
 * GET — Listar modelos disponíveis no endpoint LM Studio
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { listModels, testConnection } from '@/lib/ia/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const endpoint = request.nextUrl.searchParams.get('endpoint') || undefined;
    const apiKey = request.nextUrl.searchParams.get('api_key') || undefined;
    const testMode = request.nextUrl.searchParams.get('test') === 'true';

    if (testMode) {
      const result = await testConnection(endpoint, apiKey);
      return NextResponse.json(result);
    }

    const models = await listModels(endpoint, apiKey);

    return NextResponse.json({
      models: models.map(m => ({
        id: m.id,
        object: m.object || 'model',
        owned_by: m.owned_by || 'provider',
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
