import { NextResponse } from 'next/server';
import { mioClient } from '@/lib/mio/client';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await mioClient.testConnection();
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
