import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const authHeader = request.headers.get('authorization');
        let token = extractTokenFromHeader(authHeader || undefined);
        if (!token) {
            token = request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value || null;
        }
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { id } = params;
        const body = await request.json();
        const role = payload.role?.toUpperCase() || 'USER';
        const userId = payload.userId;

        // Fetch current order to check permissions
        const { data: currentOrder, error: fetchError } = await supabaseAdmin
            .from('purchase_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !currentOrder) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Permission Check
        let canEdit = false;
        if (role === 'ADMIN') canEdit = true;
        else if (role === 'MANAGER') {
            // Managers can only update if assigned to them or if they own it
            if (currentOrder.manager_id === userId || currentOrder.user_id === userId) {
                canEdit = true;
            }
        } else {
            // Users can only update their own drafts
            if (currentOrder.user_id === userId && currentOrder.status === 'draft') {
                canEdit = true;
            }
        }

        if (!canEdit) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        // Update Logic
        const updates: any = { ...body };

        // Append to history if status changes
        if (body.status && body.status !== currentOrder.status) {
            const newHistoryItem = {
                action: 'status_change',
                from: currentOrder.status,
                to: body.status,
                user_id: userId,
                note: body.note || '',
                date: new Date().toISOString()
            };
            updates.history = [...(currentOrder.history || []), newHistoryItem];
        }

        const { data, error } = await supabaseAdmin
            .from('purchase_orders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Send Email Notification on Status Change
        if (body.status && ['approved', 'rejected'].includes(body.status) && body.status !== currentOrder.status) {
            (async () => {
                try {
                    // Fetch owner email
                    const { data: owner } = await supabaseAdmin
                        .from('users_unified')
                        .select('name, email')
                        .eq('id', currentOrder.user_id)
                        .single();

                    // Fetch admin/manager name (who updated it)
                    const { data: updater } = await supabaseAdmin
                        .from('users_unified')
                        .select('name')
                        .eq('id', userId)
                        .single();

                    const poNumber = currentOrder.po_number || currentOrder.id;
                    const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/department/purchase-orders/${currentOrder.id}`;

                    const { sendEmail } = await import('@/lib/email-exchange');
                    const { orderStatusUpdateTemplate, poApprovedFiscalTemplate } = await import('@/lib/emailTemplates');

                    // 1. Notify Owner (Approved/Rejected)
                    if (owner?.email) {
                        const htmlUser = orderStatusUpdateTemplate(
                            owner.name || 'Colaborador',
                            poNumber,
                            currentOrder.provider_name,
                            body.status,
                            updater?.name || 'Administrador',
                            body.note,
                            viewUrl
                        );

                        await sendEmail(
                            owner.email,
                            `Ordem de Compra ${body.status === 'approved' ? 'Aprovada' : 'Rejeitada'} - ${poNumber}`,
                            `Sua ordem de compra foi ${body.status === 'approved' ? 'aprovada' : 'rejeitada'}.`,
                            htmlUser
                        );
                    }

                    // 2. If APPROVED, Notify Fiscal
                    if (body.status === 'approved') {
                        const FISCAL_EMAIL = 'fiscal@groupabz.com';
                        const htmlFiscal = poApprovedFiscalTemplate(
                            poNumber,
                            owner?.name || 'Não identificado',
                            currentOrder.provider_name,
                            currentOrder.total_value,
                            updater?.name || 'Diretoria',
                            currentOrder.invoice_url || '#',
                            viewUrl
                        );

                        await sendEmail(
                            FISCAL_EMAIL,
                            `OC APROVADA - ${poNumber}`,
                            `Ordem de compra aprovada para processamento.`,
                            htmlFiscal
                        );
                    }

                } catch (emailError) {
                    console.error('Failed to send status update email:', emailError);
                }
            })();
        }

        return NextResponse.json({ data, success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const authHeader = request.headers.get('authorization');
        let token = extractTokenFromHeader(authHeader || undefined);
        if (!token) {
            token = request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value || null;
        }
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const { id } = params;
        const role = payload.role?.toUpperCase() || 'USER';

        // Only Admins can delete
        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
        }

        const { error } = await supabaseAdmin
            .from('purchase_orders')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
