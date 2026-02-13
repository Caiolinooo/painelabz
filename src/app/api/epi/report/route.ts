import { NextResponse } from 'next/server';
import { getGeneralEPIReportData } from '@/services/epiService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
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
