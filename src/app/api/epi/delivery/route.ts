import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { userId, registrationIds, signatureBase64 } = await req.json();

        if (!userId || !registrationIds || !Array.isArray(registrationIds) || !signatureBase64) {
            return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
        }

        // 1. Upload Signature
        const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${userId}-${Date.now()}.png`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
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

        const signatureUrl = publicUrlData.publicUrl;

        // 2. Update Registrations
        const now = new Date().toISOString();
        const { error: updateError } = await supabaseAdmin
            .from('epi_registrations')
            .update({
                status: 'delivered',
                signature_url: signatureUrl,
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

        return NextResponse.json({ success: true, signatureUrl });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}
