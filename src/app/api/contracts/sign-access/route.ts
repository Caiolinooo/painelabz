import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateUser, checkPermissions } from '@/lib/api-auth';
import { generateSHA256 } from '@/lib/services/CryptographyService';

export const dynamic = 'force-dynamic';

// POST — Generate secure access to sign a document (used by both authenticated and public signers)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { documento_id, email } = body;

        if (!documento_id) {
            return NextResponse.json({
                error: 'Campo obrigatório: documento_id'
            }, { status: 400 });
        }

        // Try authenticated access first
        const { user, error: authError } = await authenticateUser(request);
        const isPublicAccess = !user || authError;

        // Fetch the document
        const { data: documento, error: docError } = await supabaseAdmin
            .from('documentos_trabalhistas')
            .select('*')
            .eq('id', documento_id)
            .single();

        if (docError || !documento) {
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
        }

        // For managers: allow direct access
        if (!isPublicAccess && user) {
            const isManager = checkPermissions(user, 'contracts_manager');

            if (!isManager) {
                // Non-managers must have an assignment for this document
                const { data: assignment } = await supabaseAdmin
                    .from('solicitacoes_assinatura')
                    .select('id, status')
                    .eq('documento_id', documento_id)
                    .eq('colaborador_id', user.id)
                    .single();

                if (!assignment) {
                    // Auto-assign for self-service: create a pending assignment
                    const { data: newAssignment, error: assignError } = await supabaseAdmin
                        .from('solicitacoes_assinatura')
                        .insert({
                            documento_id,
                            colaborador_id: user.id,
                            pagina_assinatura: 1,
                            posicao_x: 100,
                            posicao_y: 500,
                            largura_assinatura: 150,
                            altura_assinatura: 50,
                            tipo: 'assinatura',
                            status: 'PENDING',
                        })
                        .select('*')
                        .single();

                    if (assignError) {
                        // If duplicate key (23505), it means there's already an assignment
                        if (assignError.code !== '23505') {
                            console.error('Erro ao auto-atribuir:', assignError);
                            return NextResponse.json({ error: 'Erro ao criar atribuição' }, { status: 500 });
                        }
                    }
                } else if (assignment.status === 'SIGNED') {
                    return NextResponse.json({
                        error: 'Este documento já foi assinado por você',
                        code: 'ALREADY_SIGNED'
                    }, { status: 403 });
                }
            }
        }

        // Generate signed URL for secure PDF access
        let storagePath = documento.arquivo_url;

        if (storagePath.includes('/storage/v1/object/')) {
            const bucketMarker = '/documentos-trabalhistas/';
            if (storagePath.includes(bucketMarker)) {
                const parts = storagePath.split(bucketMarker);
                storagePath = decodeURIComponent(parts[1]);
            } else {
                const parts = storagePath.split('/object/public/');
                if (parts.length > 1) {
                    const pathParts = parts[1].split('/');
                    storagePath = decodeURIComponent(pathParts.slice(1).join('/'));
                }
            }
        }
        // Não alterar o caminho caso seja relativo, pois ele inicia com o prefixo válido 'documentos/'.

        if (!storagePath) {
            return NextResponse.json({
                error: 'Documento não encontrado no storage',
                code: 'STORAGE_ERROR'
            }, { status: 404 });
        }

        const bucket = supabaseAdmin.storage.from('documentos-trabalhistas');

        try {
            const { data: signedData, error: signedError } = await bucket.createSignedUrl(storagePath, 3600);

            if (!signedError && signedData?.signedUrl) {
                // Also fetch or create the assignment for public access
                let solicitacaoId = null;

                // For public access via email link, find or create assignment
                if (isPublicAccess) {
                    // Look for any pending assignment
                    const { data: assignments } = await supabaseAdmin
                        .from('solicitacoes_assinatura')
                        .select('id')
                        .eq('documento_id', documento_id)
                        .eq('status', 'PENDING')
                        .limit(1)
                        .single();

                    if (assignments) {
                        solicitacaoId = assignments.id;
                    }
                }

                return NextResponse.json({
                    success: true,
                    documento: {
                        id: documento.id,
                        titulo: documento.titulo,
                        descricao: documento.descricao,
                        hash_original: documento.hash_original,
                    },
                    pdf_url: signedData.signedUrl,
                    solicitacao_id: solicitacaoId,
                    is_public: isPublicAccess,
                });
            } else {
                console.error('[sign-access] Erro ao gerar URL assinada:', signedError);
                return NextResponse.json({
                    error: `Erro ao acessar documento: ${signedError?.message || 'Erro desconhecido'}`,
                    code: 'STORAGE_ERROR'
                }, { status: 500 });
            }
        } catch (storageError: any) {
            console.error('[sign-access] Erro ao gerar URL assinada:', storageError);
            return NextResponse.json({
                error: `Erro ao acessar documento no storage: ${storageError.message}`,
                code: 'STORAGE_ERROR'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Erro em POST /api/contracts/sign-access:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}