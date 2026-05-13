import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateUser, checkPermissions } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// POST — Send document via email
export async function POST(request: NextRequest) {
    try {
        const { user, error: authError } = await authenticateUser(request);
        if (authError) return authError;
        if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

        if (!checkPermissions(user, 'contracts_manager')) {
            return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
        }

        const body = await request.json();
        const { documento_id, recipient_email } = body;

        if (!documento_id || !recipient_email) {
            return NextResponse.json({ 
                error: 'Campos obrigatórios: documento_id, recipient_email' 
            }, { status: 400 });
        }

        // Get document info
        const { data: doc, error: docError } = await supabaseAdmin
            .from('documentos_trabalhistas')
            .select('id, titulo, arquivo_url')
            .eq('id', documento_id)
            .single();

        if (docError || !doc) {
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
        }

        // Generate public signing link
        const { getAppBaseUrl } = await import('@/lib/app-url');
        const { baseTemplate } = await import('@/lib/emailTemplates');
        const baseUrl = getAppBaseUrl();
        const signLink = `${baseUrl}/contratos/${documento_id}/assinar?publico=true&email=${encodeURIComponent(recipient_email)}`;

        // Send email notification
        try {
            const { sendEmail } = await import('@/lib/email-service');
            const emailText = `Novo documento para assinatura: ${doc.titulo}\n\nAcesse o link para assinar: ${signLink}`;
            const emailHtml = baseTemplate(`
                <div style="color: #333;">
                    <h2 style="color: #1a56db;">Novo documento para assinatura</h2>
                    <p>Olá,</p>
                    <p>Você recebeu um documento que requer sua assinatura eletrônica:</p>
                    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                        <strong>Documento:</strong> ${doc.titulo}
                    </div>
                    <p>Clique no botão abaixo para acessar e assinar o documento:</p>
                    <div style="margin: 25px 0;">
                        <a href="${signLink}" style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Assinar Documento
                        </a>
                    </div>
                    <p style="font-size: 12px; color: #6b7280; margin-top: 16px;">
                        Este link é válido por 7 dias.
                    </p>
                </div>
            `);

            await sendEmail(
                recipient_email,
                `Documento para assinatura: ${doc.titulo}`,
                emailText,
                emailHtml
            );

            return NextResponse.json({ success: true, message: 'E-mail enviado com sucesso' });
        } catch (emailError: any) {
            console.error('Erro ao enviar e-mail:', emailError);
            return NextResponse.json({ 
                error: `Erro ao enviar e-mail: ${emailError.message}` 
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Erro em POST /api/contracts/send-email:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}