import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { getGeneralEPIReportData } from '@/services/epiService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Authentication (same pattern as /api/epi)
        const authHeader = request.headers.get('authorization');
        let token = extractTokenFromHeader(authHeader || undefined);

        if (!token) {
            const tokenCookie = request.cookies.get('abzToken') || request.cookies.get('token');
            if (tokenCookie) {
                token = tokenCookie.value;
            }
        }

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { startDate, endDate, status, onlyRequests } = body;

        const data = await getGeneralEPIReportData({
            startDate,
            endDate,
            status,
            onlyRequests
        });

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('Error fetching report data:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
