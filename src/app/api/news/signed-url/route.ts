import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyTokenFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate Request
        const authResult = await verifyTokenFromRequest(request);

        if (!authResult.valid || !authResult.user) {
            console.error('[SIGNED_URL] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authResult.userId;
        const { filePath, fileType } = await request.json();

        if (!filePath) {
            return NextResponse.json({ error: 'Missing filePath' }, { status: 400 });
        }

        console.log(`[SIGNED_URL] Generating signed url for: ${filePath} (User: ${userId})`);

        // 2. Generate Signed URL using Admin Client
        const supabaseAdmin = await getSupabaseAdmin();

        // createSignedUploadUrl creates a URL that allows uploading a specific file
        // valid for 60 seconds (enough to start the upload)
        const { data, error } = await supabaseAdmin
            .storage
            .from('news')
            .createSignedUploadUrl(filePath);

        if (error) {
            console.error('[SIGNED_URL] Error generating url:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('[SIGNED_URL] URL generated successfully');

        return NextResponse.json({
            signedUrl: data.signedUrl,
            token: data.token,
            path: data.path,
            fullPath: filePath
        });

    } catch (error: any) {
        console.error('[SIGNED_URL] Critical error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
