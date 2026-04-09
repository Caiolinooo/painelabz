import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Support both new format (signatureUrl) and legacy format (signatureBase64)
        const { userId, registrationIds, signatureUrl, signatureBase64, authMethod } = body;

        if (!userId || !registrationIds || !Array.isArray(registrationIds)) {
            return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
        }

        let finalSignatureUrl = '';

        if (signatureUrl) {
            // New format: signature URL already provided from user profile
            finalSignatureUrl = signatureUrl;
        } else if (signatureBase64) {
            // Legacy format: upload base64 image (backward compatibility)
            if (signatureBase64 === 'PASSKEY_SIGNED') {
                // Legacy passkey-only — try to fetch user's profile signature instead
                const { data: userData } = await supabaseAdmin
                    .from('users_unified')
                    .select('signature_url')
                    .eq('id', userId)
                    .single();

                if (userData?.signature_url) {
                    finalSignatureUrl = userData.signature_url;
                } else {
                    finalSignatureUrl = 'PASSKEY_SIGNED'; // Fallback
                }
            } else {
                const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const fileName = `${userId}-${Date.now()}.png`;

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('epi_signatures')
                    .upload(fileName, buffer, {
                        contentType: 'image/png',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Error uploading signature:', uploadError);
                    return NextResponse.json({ error: 'Erro ao salvar assinatura' }, { status: 500 });
                }

                const { data: publicUrlData } = supabaseAdmin.storage
                    .from('epi_signatures')
                    .getPublicUrl(fileName);

                finalSignatureUrl = publicUrlData.publicUrl;
            }
        } else {
            return NextResponse.json({ error: 'signatureUrl ou signatureBase64 é obrigatório' }, { status: 400 });
        }

        // Update Registrations
        const now = new Date().toISOString();
        const { error: updateError } = await supabaseAdmin
            .from('epi_registrations')
            .update({
                status: 'delivered',
                signature_url: finalSignatureUrl,
                signed_at: now,
                delivered_at: now,
                updated_at: now
            })
            .in('id', registrationIds)
            .eq('user_id', userId);

        if (updateError) {
            console.error('Error updating registrations:', updateError);
            return NextResponse.json({ error: 'Erro ao atualizar registros' }, { status: 500 });
        }

        return NextResponse.json({ success: true, signatureUrl: finalSignatureUrl });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}
