import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const authHeader = request.headers.get('authorization');
        let token = extractTokenFromHeader(authHeader || undefined);

        if (!token) {
            token = request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value || null;
        }

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const fileName = `${Date.now()}-${payload.userId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `invoices/${fileName}`;

        // Convert file to buffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabaseAdmin.storage
            .from('purchase-orders')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('purchase-orders')
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            url: publicUrl
        });

    } catch (error: any) {
        console.error('File upload API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
