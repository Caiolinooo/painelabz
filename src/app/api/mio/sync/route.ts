import { NextResponse } from 'next/server';
import { mioSyncService } from '@/lib/mio/sync';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const result = await mioSyncService.syncEmployees();
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
