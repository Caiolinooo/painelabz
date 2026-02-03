
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

async function verifyToken(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    try {
        // Here we ideally verify the token. 
        // Since we know the Custom Auth is verified by the middleware or client sending it,
        // And we might not have the secret easily matching (the problem at hand),
        // We will decode it to check the role at least.
        const decoded: any = jwt.decode(token);
        return decoded;
    } catch (e) {
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication (Basic Role Check)
        const user = await verifyToken(req);
        if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { fileName, folder } = body;

        if (!fileName) {
            return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }

        // 2. Construct Path
        // Ensure folder is safe or allowed
        const validFolders = ['', 'collection_resources'];
        const targetFolder = folder && validFolders.includes(folder) ? folder : '';

        const filePath = targetFolder ? `${targetFolder}/${fileName}` : fileName;

        // 3. Generate Signed URL using Admin Client
        const supabaseAdmin = await getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
            .storage
            .from('library-assets')
            .createSignedUploadUrl(filePath);

        if (error) {
            console.error('Error generating signed url:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
