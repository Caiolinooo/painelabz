/**
 * GET /api/epi/stock/export
 * Export stock data as an .xlsx spreadsheet in the AN-CPR-003 format.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { generateStockReportXLSX } from '@/services/stockImportExport';

export async function GET(request: NextRequest) {
    try {
        // Auth check
        const authHeader = request.headers.get('authorization');
        let token = extractTokenFromHeader(authHeader || undefined);
        if (!token) {
            const tokenCookie = request.cookies.get('abzToken') || request.cookies.get('token');
            if (tokenCookie) token = tokenCookie.value;
        }
        if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

        const payload = verifyToken(token);
        if (!payload || !payload.userId) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

        // Generate the XLSX
        const xlsxBuffer = await generateStockReportXLSX();

        const filename = `Controle_Estoque_EPI_${new Date().toISOString().split('T')[0]}.xlsx`;

        return new NextResponse(new Uint8Array(xlsxBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error: any) {
        console.error('❌ Stock export error:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao exportar relatório de estoque' },
            { status: 500 }
        );
    }
}
