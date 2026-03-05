import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * POST - Upload facilitator signature (canvas drawing) for certificate usage.
 * Accepts base64 PNG and stores in Supabase `academy_signatures` bucket.
 * Returns the public URL.
 */
export async function POST(request: NextRequest) {
    try {
        const { user: authUser, error: authError } = await authenticateUser(request);
        if (authError) return authError;
        if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

        const user = authUser as any;
        const { signatureBase64 } = await request.json();

        if (!signatureBase64) {
            return NextResponse.json({ error: 'signatureBase64 é obrigatório' }, { status: 400 });
        }

        // Biometric-only: no image to upload
        if (signatureBase64 === 'PASSKEY_SIGNED') {
            return NextResponse.json({ success: true, signatureUrl: 'PASSKEY_SIGNED' });
        }

        // Ensure bucket exists
        try {
            const { data: buckets } = await supabaseAdmin.storage.listBuckets();
            const exists = (buckets || []).some(b => b.name === 'academy-signatures');
            if (!exists) {
                await (supabaseAdmin.storage as any).createBucket('academy-signatures', { public: true });
            }
        } catch { /* bucket may already exist */ }

        // Upload PNG
        const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `instructor-${user.id}-${Date.now()}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('academy-signatures')
            .upload(fileName, buffer, { contentType: 'image/png', upsert: false });

        if (uploadError) {
            console.error('Erro ao salvar assinatura:', uploadError);
            return NextResponse.json({ error: 'Erro ao salvar assinatura' }, { status: 500 });
        }

        const { data: publicUrlData } = supabaseAdmin.storage
            .from('academy-signatures')
            .getPublicUrl(fileName);

        return NextResponse.json({ success: true, signatureUrl: publicUrlData.publicUrl });
    } catch (error) {
        console.error('Erro em POST signatures:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
