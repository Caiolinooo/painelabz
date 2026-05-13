import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendGlobalNotification } from '@/lib/global-notifications';
import { sendEmail } from '@/lib/email';
import { buildAppUrl } from '@/lib/app-url';
import { baseTemplate } from '@/lib/emailTemplates';
import crypto from 'crypto';

export async function dispatchEnvelopeStage(envelopeId: string) {
    try {
        console.log(`[Dispatcher] Iniciando processamento para envelope ${envelopeId}...`);

        // 1. Obter dados do envelope e documentos associados para compor as mensagens
        const { data: envelope, error: envError } = await supabaseAdmin
            .from('envelopes')
            .select('*')
            .eq('id', envelopeId)
            .single();

        if (envError || !envelope) {
            throw new Error(`Envelope não encontrado: ${envError?.message}`);
        }

        // 2. Obter todas as solicitações de assinatura do envelope ordenadas
        const { data: solicitacoes, error: solError } = await supabaseAdmin
            .from('solicitacoes_assinatura')
            .select(`
                *,
                colaborador:users_unified!colaborador_id (id, first_name, last_name, email)
            `)
            .eq('envelope_id', envelopeId)
            .order('ordem', { ascending: true });

        if (solError) {
            throw new Error(`Erro ao buscar solicitações: ${solError.message}`);
        }

        if (!solicitacoes || solicitacoes.length === 0) {
            console.log('[Dispatcher] Nenhuma solicitação encontrada para este envelope.');
            return { success: true, message: 'Nenhuma solicitação pendente' };
        }

        // 3. Determinar o status atual do envelope (Ignorando observadores CC que não assinam)
        const pendentes = solicitacoes.filter(s => s.status === 'PENDING' && s.tipo !== 'copia');
        
        // Se não houver mais NADA pendente, o envelope foi 100% assinado
        if (pendentes.length === 0) {
            console.log('[Dispatcher] Todos assinaram. Concluindo envelope.');
            await supabaseAdmin
                .from('envelopes')
                .update({ status: 'COMPLETED' })
                .eq('id', envelopeId);
            
            // Notificar criador do sucesso
            if (envelope.remetente_id) {
                await sendGlobalNotification({
                    userId: envelope.remetente_id,
                    submodule: 'contratos',
                    type: 'envelope_completed',
                    title: 'Envelope Concluído!',
                    message: `O envelope "${envelope.titulo}" foi assinado por todas as partes.`,
                    actionUrl: `/contratos/${envelopeId}`,
                    channels: ['in-app', 'email']
                }).catch(e => console.warn('Erro ao notificar criador sobre conclusão:', e));
            }

            // 2. Notificar observadores (CC) sobre a finalização do envelope
            const observadores = solicitacoes.filter(s => s.tipo === 'copia');
            if (observadores.length > 0) {
                console.log(`[Dispatcher] Notificando ${observadores.length} observadores da conclusão...`);
                // Atualizar status no banco de dados
                await supabaseAdmin
                    .from('solicitacoes_assinatura')
                    .update({ status: 'COMPLETED' })
                    .eq('envelope_id', envelopeId)
                    .eq('tipo', 'copia');

                for (const obs of observadores) {
                    const email = obs.colaborador?.email || obs.external_signer_email;
                    const name = obs.colaborador?.first_name || obs.external_signer_name || 'Observador';
                    if (email) {
                        const emailText = `Olá ${name},\n\nO envelope "${envelope.titulo}" foi concluído e assinado por todos os signatários.\n\nAtenciosamente,\nABZ Group`;
                        const emailHtml = baseTemplate(`
                            <div style="color: #333; max-width: 600px;">
                                <h2 style="color: #10b981;">Envelope Concluído!</h2>
                                <p>Olá, <strong>${name}</strong>,</p>
                                <p>Informamos que o processo de assinaturas para o envelope <strong>"${envelope.titulo}"</strong> foi finalizado com sucesso por todas as partes.</p>
                                <p>Você recebeu este e-mail pois foi incluído em cópia para acompanhamento do fluxo.</p>
                            </div>
                        `);
                        await sendEmail(email, `Envelope Concluído: ${envelope.titulo}`, emailText, emailHtml)
                            .catch(e => console.warn(`[Dispatcher] Falha ao notificar observador ${email} da conclusão:`, e));
                    }
                }
            }

            return { success: true, status: 'COMPLETED' };
        }

        // 4. Encontrar a MENOR ORDEM pendente
        const ordensPendentes = pendentes.map(p => p.ordem || 1);
        const minOrdem = Math.min(...ordensPendentes);

        console.log(`[Dispatcher] Menor ordem pendente identificada: ${minOrdem}`);

        // 5. Obter TODOS os signatários desse estágio (podem ter múltiplos na mesma ordem)
        const signatariosDaVez = pendentes.filter(s => (s.ordem || 1) === minOrdem);
        
        // Agrupar por identificador único (ID do colaborador ou E-mail externo)
        // Isso garante que um e-mail seja enviado uma única vez por estágio para cada recipiente distinto
        const uniqueRecipients = Array.from(new Set(signatariosDaVez.map(s => 
            s.colaborador_id || s.external_signer_email
        )));

        let notifyCount = 0;

        for (const recipientKey of uniqueRecipients) {
            if (!recipientKey) continue;

            // Filtrar registros desse grupo
            const groupForUser = signatariosDaVez.filter(s => 
                (s.colaborador_id === recipientKey) || (s.external_signer_email === recipientKey)
            );
            
            const firstRequest = groupForUser[0];
            
            // Garantir token robusto
            let finalToken = firstRequest.token_acesso;
            if (!finalToken) {
                finalToken = crypto.randomUUID();
                
                // Atualizar o token em todo o bloco desse recipiente
                let q = supabaseAdmin
                    .from('solicitacoes_assinatura')
                    .update({ token_acesso: finalToken })
                    .eq('envelope_id', envelopeId)
                    .eq('ordem', minOrdem)
                    .eq('status', 'PENDING');
                
                if (firstRequest.colaborador_id) {
                    q = q.eq('colaborador_id', firstRequest.colaborador_id);
                } else {
                    q = q.eq('external_signer_email', firstRequest.external_signer_email);
                }

                await q;
            }

            const actionUrl = `/assinatura/${finalToken}`;
            const fullAccessUrl = buildAppUrl(actionUrl);

            // IDENTIFICAR SE É USUÁRIO SISTEMA OU EXTERNO
            if (firstRequest.colaborador_id) {
                // --- FLUXO SISTEMA (Notificação Global) ---
                const user = firstRequest.colaborador;
                if (!user) continue;

                console.log(`[Dispatcher] Enviando notificação sistêmica para ${user.email}`);
                
                await sendGlobalNotification({
                    userId: firstRequest.colaborador_id,
                    submodule: 'contratos',
                    type: 'signature_requested',
                    title: 'Pendência de Assinatura',
                    message: `Você possui documentos no envelope "${envelope.titulo}" aguardando sua assinatura eletrônica.`,
                    actionUrl: actionUrl,
                    channels: ['in-app', 'email', 'push'],
                    priority: 'high'
                }).catch(err => {
                    console.error(`[Dispatcher] Falha ao notificar ${user.email}:`, err);
                });
            } else {
                // --- FLUXO EXTERNO (E-mail Direto) ---
                const targetEmail = firstRequest.external_signer_email;
                const targetName = firstRequest.external_signer_name || 'Signatário';
                
                if (!targetEmail) continue;

                console.log(`[Dispatcher] Enviando e-mail direto para ${targetEmail}`);

                const emailText = `Olá ${targetName},\n\nVocê foi convidado a assinar documentos eletronicamente no envelope "${envelope.titulo}".\n\nAcesse o link para assinar:\n${fullAccessUrl}\n\nAtenciosamente,\nABZ Group`;
                const emailHtml = baseTemplate(`
                    <div style="color: #333;">
                        <h2>Assinatura de Documento Solicitada</h2>
                        <p>Olá, <strong>${targetName}</strong>,</p>
                        <p>Você foi convidado a visualizar e assinar eletronicamente o envelope <strong>"${envelope.titulo}"</strong>.</p>
                        <p>Para prosseguir com a assinatura, clique no botão abaixo:</p>
                        <div style="margin: 25px 0;">
                            <a href="${fullAccessUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                                Acessar e Assinar
                            </a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #777;">Caso o botão não funcione, copie e cole este link no navegador:<br>${fullAccessUrl}</p>
                    </div>
                `);

                await sendEmail(targetEmail, `Solicitação de Assinatura: ${envelope.titulo}`, emailText, emailHtml)
                    .catch(err => console.error(`[Dispatcher] Falha ao enviar e-mail para ${targetEmail}:`, err));
            }

            notifyCount++;
        }

        // Se for o DISPARO INICIAL (status !== 'SENT'), notificar observadores sobre o início
        if (envelope.status !== 'SENT') {
            const observadores = solicitacoes.filter(s => s.tipo === 'copia');
            if (observadores.length > 0) {
                console.log(`[Dispatcher] Notificando ${observadores.length} observadores do início do fluxo...`);
                for (const obs of observadores) {
                    const email = obs.colaborador?.email || obs.external_signer_email;
                    const name = obs.colaborador?.first_name || obs.external_signer_name || 'Observador';
                    if (email) {
                        const emailText = `Olá ${name},\n\nVocê foi incluído em cópia para acompanhar o processo de assinatura do envelope "${envelope.titulo}".\n\nVocê receberá uma cópia dos documentos concluídos assim que todas as partes assinarem.\n\nAtenciosamente,\nABZ Group`;
                        const emailHtml = baseTemplate(`
                            <div style="color: #333; max-width: 600px;">
                                <h2 style="color: #4f46e5;">Acompanhamento de Assinatura</h2>
                                <p>Olá, <strong>${name}</strong>,</p>
                                <p>Informamos que você foi incluído em cópia para acompanhar o fluxo de assinaturas do envelope <strong>"${envelope.titulo}"</strong>.</p>
                                <p>Este é um aviso de acompanhamento. Nenhuma ação é necessária de sua parte neste momento. Enviaremos uma cópia dos documentos assinados automaticamente assim que o fluxo for finalizado.</p>
                            </div>
                        `);
                        await sendEmail(email, `Acompanhamento: Fluxo Iniciado - ${envelope.titulo}`, emailText, emailHtml)
                            .catch(e => console.warn(`[Dispatcher] Falha ao notificar observador ${email} do início:`, e));
                    }
                }
            }
        }

        // Atualiza o status do envelope para 'IN_PROGRESS' / 'SENT'
        await supabaseAdmin
            .from('envelopes')
            .update({ status: 'SENT' })
            .eq('id', envelopeId);

        return { 
            success: true, 
            status: 'SENT', 
            stage: minOrdem, 
            notifiedCount: notifyCount 
        };

    } catch (error: any) {
        console.error('[Dispatcher] Erro FATAL no fluxo de despacho:', error);
        return { success: false, error: error.message };
    }
}
