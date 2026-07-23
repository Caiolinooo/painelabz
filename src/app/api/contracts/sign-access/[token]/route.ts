import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    try {
        const { token } = params;

        if (!token) {
            return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
        }

        // 1. Fetch the reference solicitation for this token
        const { data: refSols, error: refError } = await supabaseAdmin
            .from('solicitacoes_assinatura')
            .select(`
                *,
                documento:documentos_trabalhistas (*),
                colaborador:users_unified!colaborador_id (email, first_name, last_name, tax_id, birth_date),
                envelope:envelopes!envelope_id (id, titulo, remetente_id)
            `)
            .eq('token_acesso', token);

        if (refError || !refSols || refSols.length === 0) {
            return NextResponse.json({ error: 'Link de assinatura inválido ou expirado' }, { status: 404 });
        }

        const refSol = refSols[0];

        // 2. Fetch ALL solicitations for this envelope that belong to this signer (collaborator or external signer)
        let query = supabaseAdmin
            .from('solicitacoes_assinatura')
            .select(`
                *,
                documento:documentos_trabalhistas (*),
                colaborador:users_unified!colaborador_id (email, first_name, last_name, tax_id, birth_date),
                envelope:envelopes!envelope_id (id, titulo, remetente_id)
            `)
            .eq('envelope_id', refSol.envelope_id);

        if (refSol.colaborador_id) {
            query = query.eq('colaborador_id', refSol.colaborador_id);
        } else if (refSol.external_signer_email) {
            query = query.eq('external_signer_email', refSol.external_signer_email);
        } else {
            query = query.eq('id', refSol.id);
        }

        const { data: solicitacoes, error: solError } = await query;

        if (solError || !solicitacoes || solicitacoes.length === 0) {
            return NextResponse.json({ error: 'Erro ao buscar solicitações de assinatura' }, { status: 500 });
        }

        // 1.5. Track View & Notify Creator if not viewed before
        // Filter only pending requests that have never been viewed
        const unviewedSolicitacoes = solicitacoes.filter((sol: any) => !sol.visualizado_em && sol.status === 'PENDING');
        
        if (unviewedSolicitacoes.length > 0) {
            const now = new Date().toISOString();
            const unviewedIds = unviewedSolicitacoes.map((sol: any) => sol.id);
            
            // Mark as viewed in DB
            await supabaseAdmin
                .from('solicitacoes_assinatura')
                .update({ visualizado_em: now })
                .in('id', unviewedIds);
                
            // Notify Envelope Creator/Sender about the view
            try {
                const firstSol = unviewedSolicitacoes[0];
                const remetenteId = firstSol.envelope?.remetente_id || firstSol.documento?.enviado_por;
                
                if (remetenteId) {
                    const { sendGlobalNotification } = await import('@/lib/global-notifications');
                    
                    const viewerName = firstSol.colaborador 
                        ? `${firstSol.colaborador.first_name} ${firstSol.colaborador.last_name || ''}`.trim() 
                        : firstSol.external_signer_name;
                        
                    const envelopeTitle = firstSol.envelope?.titulo || 'Envelope de Documentos';
                    
                    await sendGlobalNotification({
                        userId: remetenteId,
                        submodule: 'contratos',
                        type: 'signature_viewed',
                        title: 'Documento visualizado',
                        message: `${viewerName || 'Um signatário'} visualizou os documentos do envelope "${envelopeTitle}".`,
                        actionUrl: `/contratos/${firstSol.envelope_id}`,
                        channels: ['in-app', 'email'],
                        priority: 'low'
                    });
                }
            } catch (notifErr) {
                console.error('Erro ao enviar notificação de visualização:', notifErr);
            }
        }

        // 2. Iterate over all tasks in this batch and generate signed URLs
        const bucket = supabaseAdmin.storage.from('documentos-trabalhistas');
        
        const payload = await Promise.all(solicitacoes.map(async (sol: any) => {
            const doc = sol.documento;
            let currentPdfUrl = null;

            // Check if this document has signed steps already (from a previous signer in the chain)
            const { data: lastAudit } = await supabaseAdmin
                .from('auditoria_assinaturas')
                .select('arquivo_assinado_url, solicitacoes_assinatura!inner(documento_id)')
                .eq('solicitacoes_assinatura.documento_id', doc.id)
                .order('data_assinatura', { ascending: false })
                .limit(1)
                .single();

            let finalPathToSign = doc?.arquivo_url;
            
            // Prioritize the accumulated signed file
            if (lastAudit && lastAudit.arquivo_assinado_url) {
                finalPathToSign = lastAudit.arquivo_assinado_url;
            }

            if (finalPathToSign) {
                let storagePath = finalPathToSign;

                if (storagePath.includes('/storage/v1/object/')) {
                    const bucketMarker = '/documentos-trabalhistas/';
                    if (storagePath.includes(bucketMarker)) {
                        const parts = storagePath.split(bucketMarker);
                        storagePath = decodeURIComponent(parts[1]);
                        if (storagePath.includes('?')) {
                            storagePath = storagePath.split('?')[0];
                        }
                    } else {
                        const parts = storagePath.split('/object/public/');
                        if (parts.length > 1) {
                            const pathParts = parts[1].split('/');
                            storagePath = decodeURIComponent(pathParts.slice(1).join('/'));
                        }
                    }
                }

                const { data: signedData } = await bucket.createSignedUrl(storagePath, 3600);
                if (signedData?.signedUrl) {
                    currentPdfUrl = signedData.signedUrl;
                } else {
                    // If signedUrl fails, fallback to original to avoid blocking UI entirely
                    currentPdfUrl = finalPathToSign;
                }
            }

            const targetEmail = sol.colaborador?.email || sol.external_signer_email;
            const targetName = sol.colaborador 
                ? `${sol.colaborador.first_name} ${sol.colaborador.last_name || ''}`.trim() 
                : sol.external_signer_name;
            const targetTaxId = sol.colaborador?.tax_id || sol.external_signer_tax_id || null;
            const targetBirthDate = sol.colaborador?.birth_date || sol.external_signer_birth_date || null;

            return {
                id: sol.id,
                status: sol.status,
                ordem: sol.ordem,
                tipo: sol.tipo,
                pagina_assinatura: sol.pagina_assinatura,
                posicao_x: sol.posicao_x,
                posicao_y: sol.posicao_y,
                largura_assinatura: sol.largura_assinatura,
                altura_assinatura: sol.altura_assinatura,
                target_email: targetEmail,
                target_name: targetName,
                target_tax_id: targetTaxId,
                target_birth_date: targetBirthDate,
                valor_preenchido: sol.valor_preenchido,
                documento: {
                    id: doc?.id,
                    titulo: doc?.titulo,
                    descricao: doc?.descricao,
                    hash_original: doc?.hash_original
                },
                pdf_url: currentPdfUrl
            };
        }));

        return NextResponse.json({
            success: true,
            queue: payload
        });

    } catch (error) {
        console.error('Erro em GET /api/contracts/sign-access/[token]:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
