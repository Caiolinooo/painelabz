import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET — Retorna a assinatura do perfil do usuário logado
 */
export async function GET(request: NextRequest) {
    try {
        const { user: authUser, error: authError } = await authenticateUser(request);
        if (authError) return authError;
        if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

        const { data, error } = await supabaseAdmin
            .from('users_unified')
            .select('signature_url, signature_registered_at')
            .eq('id', authUser.id)
            .single();

        if (error) {
            console.error('Erro ao buscar assinatura:', error);
            return NextResponse.json({ error: 'Erro ao buscar assinatura' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            signatureUrl: data?.signature_url || null,
            registeredAt: data?.signature_registered_at || null,
            hasSignature: !!data?.signature_url,
        });
    } catch (error) {
        console.error('Erro em GET /api/user/signature:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

/**
 * POST — Cadastra ou atualiza a assinatura do perfil do usuário
 * Espera: { signatureBase64: string } no body
 * A assinatura é salva no bucket user-signatures/{userId}.png (upsert)
 */
export async function POST(request: NextRequest) {
    try {
        const { user: authUser, error: authError } = await authenticateUser(request);
        if (authError) return authError;
        if (!authUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

        const { signatureBase64 } = await request.json();

        if (!signatureBase64 || typeof signatureBase64 !== 'string') {
            return NextResponse.json({ error: 'signatureBase64 é obrigatório' }, { status: 400 });
        }

        // Ensure bucket exists
        try {
            const { data: buckets } = await supabaseAdmin.storage.listBuckets();
            const exists = (buckets || []).some((b: any) => b.name === 'user-signatures');
            if (!exists) {
                await (supabaseAdmin.storage as any).createBucket('user-signatures', { public: true });
            }
        } catch { /* bucket may already exist */ }

        // Upload PNG (upsert — uma por usuário)
        const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${authUser.id}.png`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('user-signatures')
            .upload(fileName, buffer, {
                contentType: 'image/png',
                upsert: true,
            });

        if (uploadError) {
            console.error('Erro ao salvar assinatura:', uploadError);
            return NextResponse.json({ error: 'Erro ao salvar assinatura' }, { status: 500 });
        }

        // Get public URL
        const { data: publicUrlData } = supabaseAdmin.storage
            .from('user-signatures')
            .getPublicUrl(fileName);

        const signatureUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`; // Cache bust

        // Update user profile
        const { error: updateError } = await supabaseAdmin
            .from('users_unified')
            .update({
                signature_url: signatureUrl,
                signature_registered_at: new Date().toISOString(),
            })
            .eq('id', authUser.id);

        if (updateError) {
            console.error('Erro ao atualizar perfil:', updateError);
            return NextResponse.json({ error: 'Erro ao atualizar perfil com assinatura' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            signatureUrl,
            registeredAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Erro em POST /api/user/signature:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
