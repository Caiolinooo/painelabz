import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { auditarConsistenciaEsocialAso } from '@/lib/gestao-tripulantes/esocial-consistency';

export const dynamic = 'force-dynamic';

// ────────────────────────────────────────────────────────────────
// GET /api/gestao-tripulantes/esocial-consistencia
// Expõe como dados consultáveis os achados de consistência do vínculo
// e-Social ↔ ASOs (CPF divergente, eventos órfãos, status divergente).
// Painel visual fica para depois; a auditoria visual (aba Auditoria)
// é mantida por outro fluxo — esta rota é independente dela.
// ────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tipo = (searchParams.get('tipo') || '').trim().toUpperCase();

    const relatorio = await auditarConsistenciaEsocialAso();

    const tiposValidos = ['CPF_MISMATCH', 'EVENTO_ORFAO', 'STATUS_DIVERGENTE'];
    const achadosFiltrados =
      tipo && tiposValidos.includes(tipo)
        ? relatorio.achados.filter(a => a.tipo === tipo)
        : relatorio.achados;

    return NextResponse.json({
      success: true,
      data: {
        ...relatorio,
        achados: achadosFiltrados,
        filtro_tipo: tipo || null,
        total_achados: achadosFiltrados.length,
      },
    });
  } catch (error) {
    console.error('[esocial-consistencia] Erro ao auditar consistência:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
