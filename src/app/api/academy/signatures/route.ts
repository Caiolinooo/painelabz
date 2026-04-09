import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * POST - Get or verify the instructor's profile signature.
 * 
 * New behavior: returns the signature from the user's profile (users_unified.signature_url).
 * Legacy behavior: if signatureBase64 is provided, uploads it and also saves to the user's profile.
 */
export async function POST(request: NextRequest) {
    try {
        const { user: authUser, error: authError } = await authenticateUser(request);
        if (authError) return authError;
        if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

        const user = authUser as any;
        const body = await request.json().catch(() => ({}));
        const { signatureBase64 } = body;

        // If no base64 provided, just return the user's profile signature
        if (!signatureBase64) {
            const { data: userData } = await supabaseAdmin
                .from('users_unified')
                .select('signature_url')
                .eq('id', user.id)
                .single();

            if (!userData?.signature_url) {
                return NextResponse.json({ error: 'Assinatura não cadastrada no perfil' }, { status: 400 });
            }

            return NextResponse.json({ success: true, signatureUrl: userData.signature_url });
        }

        // Biometric-only (legacy): return profile signature instead
        if (signatureBase64 === 'PASSKEY_SIGNED') {
            const { data: userData } = await supabaseAdmin
                .from('users_unified')
                .select('signature_url')
                .eq('id', user.id)
                .single();

            if (userData?.signature_url) {
                return NextResponse.json({ success: true, signatureUrl: userData.signature_url });
            }
            // Fallback for legacy — still return PASSKEY_SIGNED
            return NextResponse.json({ success: true, signatureUrl: 'PASSKEY_SIGNED' });
        }

        // Legacy: Upload base64 and save to BOTH academy-signatures AND user profile
        try {
            const { data: buckets } = await supabaseAdmin.storage.listBuckets();
            const exists = (buckets || []).some(b => b.name === 'user-signatures');
            if (!exists) {
                await (supabaseAdmin.storage as any).createBucket('user-signatures', { public: true });
            }
        } catch { /* bucket may already exist */ }

        const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${user.id}.png`;

        // Upload to user-signatures (profile)
        const { error: uploadError } = await supabaseAdmin.storage
            .from('user-signatures')
            .upload(fileName, buffer, { contentType: 'image/png', upsert: true });

        if (uploadError) {
            console.error('Erro ao salvar assinatura:', uploadError);
            return NextResponse.json({ error: 'Erro ao salvar assinatura' }, { status: 500 });
        }

        const { data: publicUrlData } = supabaseAdmin.storage
            .from('user-signatures')
            .getPublicUrl(fileName);

        const signatureUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

        // Also update user profile
        await supabaseAdmin
            .from('users_unified')
            .update({
                signature_url: signatureUrl,
                signature_registered_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        return NextResponse.json({ success: true, signatureUrl });
    } catch (error) {
        console.error('Erro em POST signatures:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
