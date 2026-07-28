import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { generateLeaveRequestPDF, LeaveRequestPDFData } from '@/lib/leavePDFGenerator';
import { extractTokenFromHeader, verifyToken, checkAclPermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leave/[id]/pdf
 *
 * Gera e retorna o PDF do comprovante de uma solicitação de férias
 * específica. Disponível para:
 * - O próprio colaborador (donoo da solicitação)
 * - Líder/gerente do setor (com permissão de aprovação)
 * - Admins e usuários com ACL ferias:admin/manage/read
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const requestId = params.id;
        if (!requestId) {
            return NextResponse.json({ error: 'ID da solicitação é obrigatório' }, { status: 400 });
        }

        // Autenticação
        const authHeader = request.headers.get('authorization') || undefined;
        const token = extractTokenFromHeader(authHeader);
        if (!token) {
            return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
        }
        const payload = verifyToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
        }

        // Busca a solicitação com os dados do usuário e do setor
        // CPF no portal vive em users_unified.tax_id (não há coluna `cpf` confiável).
        const { data: req, error } = await supabaseAdmin
            .from('leave_requests')
            .select(`
                *,
                user:users_unified!inner(
                    id, name, first_name, last_name, email, tax_id, sector_id, position, department,
                    sector:sectors(id, name)
                )
            `)
            .eq('id', requestId)
            .single();

        if (error || !req) {
            console.error('[Leave PDF] Solicitação não encontrada:', error);
            return NextResponse.json({ error: 'Solicitação de férias não encontrada' }, { status: 404 });
        }

        // Verificação de permissão:
        // - Dono da solicitação pode baixar
        // - Admin sempre pode
        // - Líder/gerente do setor pode (precisa checar config)
        // - Usuário com ACL ferias:read/manage/admin pode
        const isOwner = req.user_id === payload.userId;
        const isAdmin = payload.role === 'ADMIN';

        if (!isOwner && !isAdmin) {
            const hasAcl = (await checkAclPermission(payload.userId, payload.role, 'ferias', 'read')) ||
                            (await checkAclPermission(payload.userId, payload.role, 'ferias', 'manage')) ||
                            (await checkAclPermission(payload.userId, payload.role, 'ferias', 'admin'));

            if (!hasAcl) {
                // Verifica se é líder ou gerente do setor
                let isApprover = false;
                if (req.user?.sector_id) {
                    const { data: config } = await supabaseAdmin
                        .from('leave_sector_configs')
                        .select('leader_id, manager_id')
                        .eq('sector_id', req.user.sector_id)
                        .single();
                    isApprover = config?.leader_id === payload.userId || config?.manager_id === payload.userId;
                }

                if (!isApprover) {
                    return NextResponse.json({
                        error: 'Você não tem permissão para baixar este comprovante'
                    }, { status: 403 });
                }
            }
        }

        // Busca nomes do líder e gerente (se aplicável) — não pode derrubar o PDF
        let leaderName: string | undefined;
        let managerName: string | undefined;
        if (req.user?.sector_id) {
            try {
                const { data: config } = await supabaseAdmin
                    .from('leave_sector_configs')
                    .select('leader_id, manager_id')
                    .eq('sector_id', req.user.sector_id)
                    .maybeSingle();

                const ids = [config?.leader_id, config?.manager_id].filter(Boolean) as string[];
                if (ids.length > 0) {
                    const { data: people } = await supabaseAdmin
                        .from('users_unified')
                        .select('id, name, first_name, last_name')
                        .in('id', ids);

                    const label = (u: { name?: string | null; first_name?: string | null; last_name?: string | null } | undefined) =>
                        (u?.name || '').trim() || [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() || undefined;

                    const byId = new Map((people || []).map((p) => [p.id, p]));
                    leaderName = label(byId.get(config?.leader_id));
                    managerName = label(byId.get(config?.manager_id));
                }
            } catch (approverErr) {
                console.warn('[Leave PDF] Não foi possível carregar líder/gerente:', approverErr);
            }
        }

        // Monta os dados para o PDF
        const userRow = req.user as {
            name?: string | null;
            first_name?: string | null;
            last_name?: string | null;
            email?: string | null;
            tax_id?: string | null;
            position?: string | null;
            department?: string | null;
            sector?: { id?: string; name?: string } | { id?: string; name?: string }[] | null;
        } | null;

        const sectorRel = userRow?.sector;
        const sectorObj = Array.isArray(sectorRel) ? sectorRel[0] : sectorRel;
        const resolvedName = (userRow?.name || '').trim()
            || [userRow?.first_name, userRow?.last_name].filter(Boolean).join(' ').trim();

        const pdfData: LeaveRequestPDFData = {
            id: req.id,
            created_at: req.created_at,
            updated_at: req.updated_at,
            user_name: resolvedName,
            user_email: userRow?.email || '',
            user_cpf: userRow?.tax_id || undefined,
            user_position: userRow?.position || undefined,
            user_sector: sectorObj?.name || userRow?.department || undefined,
            start_date: req.start_date,
            end_date: req.end_date,
            periods: req.periods,
            status: req.status,
            justification: req.justification,
            rejection_reason: req.rejection_reason,
            pecuniary_allowance: req.pecuniary_allowance,
            advance_13th_salary: req.advance_13th_salary,
            leader_name: leaderName,
            manager_name: managerName
        };

        // Gera o PDF
        const pdfBuffer = await generateLeaveRequestPDF(pdfData);
        const pdfBytes = new Uint8Array(pdfBuffer);

        // Nome do arquivo
        const safeUserName = (resolvedName || 'colaborador')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 30);
        const fileName = `Comprovante_Ferias_${safeUserName}_${req.id.slice(0, 8)}.pdf`;

        return new NextResponse(pdfBytes, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Length': String(pdfBytes.byteLength),
                'Cache-Control': 'no-store'
            }
        });
    } catch (error) {
        console.error('[Leave PDF] Erro ao gerar comprovante:', error);
        return NextResponse.json({
            error: 'Erro interno ao gerar comprovante de férias'
        }, { status: 500 });
    }
}
