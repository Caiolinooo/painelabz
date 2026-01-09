import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        let userId = null;

        // Tentar extrair user do token se disponível
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const { verifyToken } = await import('@/lib/auth');
                const decoded = verifyToken(token);
                if (decoded && typeof decoded === 'object') {
                    userId = (decoded as any).userId;
                }
            } catch (e) {
                console.warn('Erro ao extrair user do token feedback:', e);
            }
        }

        // Se falhar via getUser (comum se usar custom auth), tentar decodificar payload se o client mandar user_id
        // Mas o widget não manda user_id explícito por segurança.
        // Vamos tentar pegar o user do cookie se existir ou confiar na sessão

        // Simplificação: Se não conseguir user via token admin, tenta pegar do body se confiarmos (não ideal)
        // Ou usamos a sessão do cookies

        const body = await request.json();
        const { type, message, url, userAgent, screenResolution } = body;

        // Se user_id ainda null, verificar cookie
        // ...

        const { error } = await supabaseAdmin
            .from('user_feedback')
            .insert({
                user_id: userId, // Pode ser null se anonimo, mas idealmente logado
                type,
                message,
                url,
                user_agent: userAgent,
                screen_resolution: screenResolution
            });

        if (error) {
            console.error('Erro ao salvar feedback:', error);
            return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
        }

        // Enviar email para admins
        try {
            // Buscar admins
            const { data: admins } = await supabaseAdmin
                .from('users_unified')
                .select('email')
                .in('role', ['ADMIN', 'MANAGER', 'SUPPORT'])
                .eq('active', true);

            if (admins && admins.length > 0) {
                const { sendCustomEmail } = await import('@/lib/notifications');
                const subject = `Novo Feedback: ${type.toUpperCase()}`;
                const htmlContent = `
                    <h2>Novo Feedback Recebido</h2>
                    <p><strong>Tipo:</strong> ${type}</p>
                    <p><strong>Mensagem:</strong> ${message}</p>
                    <p><strong>URL:</strong> ${url}</p>
                    <p><strong>Usuário ID:</strong> ${userId || 'Anônimo'}</p>
                    <br/>
                    <p>Acesse o painel para mais detalhes.</p>
                 `;

                // Enviar em paralelo
                await Promise.allSettled(admins.map(admin =>
                    admin.email ? sendCustomEmail(admin.email, subject, htmlContent) : Promise.resolve()
                ));
            }
        } catch (mailError) {
            console.error('Falha ao enviar emails de feedback:', mailError);
            // Não falhar o request por causa do email
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Feedback Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
