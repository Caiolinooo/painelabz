import { NextResponse } from 'next/server';
import { resetEPIModuleData } from '@/services/epiService';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';

// Only admins should be able to reset data
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        // Basic check - improve with role check if available in session
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ideally check for 'admin' role here
        // const userRole = session.user.role; 
        // if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        await resetEPIModuleData();

        return NextResponse.json({ success: true, message: 'Dados do módulo EPI resetados com sucesso.' });
    } catch (error: any) {
        console.error('Error resetting EPI data:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
