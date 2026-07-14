import { NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { getAdvanceNoticeDays, getMinLeaveStartDateAsync } from '@/lib/leaveConfig';

export const dynamic = 'force-dynamic';

/**
 * Endpoint público (apenas autenticado) que retorna as configurações
 * do módulo de férias relevantes para o frontend.
 *
 * Não expõe e-mails de notificação (esses são visíveis apenas para admin
 * em /api/admin/leave-settings).
 */
export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization') || undefined;
        const token = extractTokenFromHeader(authHeader);
        if (!token) {
            return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
        }
        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
        }

        const advanceNoticeDays = await getAdvanceNoticeDays();
        const minStartDate = await getMinLeaveStartDateAsync();

        return NextResponse.json({
            advanceNoticeDays,
            minStartDate
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (error) {
        console.error('Error in GET /api/leave/config:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
