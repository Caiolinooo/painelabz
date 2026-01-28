import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db'; // Use admin client for storage/db access if needed
import { isAdminFromRequest } from '@/lib/auth'; // Or just check user session
import { renderToBuffer } from '@react-pdf/renderer';
import { PurchaseOrderPdf } from '@/components/PurchaseOrder/PurchaseOrderPdf';
import { sendEmail } from '@/lib/email/service';
import React from 'react';

// Force dynamic to ensure we can read request/cookies
export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const poId = params.id;
    if (!poId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        // 1. Fetch PO Data
        const { data: po, error } = await supabaseAdmin
            .from('purchase_orders')
            .select(`
        *,
        items:purchase_order_items(*)
      `)
            .eq('id', poId)
            .single();

        if (error || !po) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // 2. Determine Configuration (Workflow Automation)
        // 2.1 Check for User-Specific Override
        let { data: config } = await supabaseAdmin
            .from('purchase_order_configs')
            .select('approver_emails, max_value, cost_centers')
            .eq('user_id', po.user_id)
            .single();

        // 2.2 If no user override, fetch Sector Default
        if (!config) {
            const { data: sectorConfig } = await supabaseAdmin
                .from('purchase_order_configs')
                .select('approver_emails, max_value, cost_centers')
                .eq('sector_id', po.sector_id)
                .is('user_id', null)
                .single();

            config = sectorConfig;
        }

        const approverEmails = (config?.approver_emails || []) as string[];

        // Also send to the creator?
        // We can fetch user email from users_unified if needed, but for now stick to approvers.

        if (approverEmails.length === 0) {
            console.warn(`No approver emails configured for PO ${poId} (User: ${po.user_id}, Sector: ${po.sector_id})`);
        } else {
            // 3. Workflow Notifications (In-Portal)
            try {
                // Find User IDs for these emails to send system notifications
                const { data: approverUsers } = await supabaseAdmin
                    .from('users_unified')
                    .select('id, email')
                    .in('email', approverEmails);

                if (approverUsers && approverUsers.length > 0) {
                    const notificationsToInsert = approverUsers.map(approver => ({
                        user_id: approver.id,
                        type: 'action', // Action required
                        title: 'Nova Aprovação Pendente',
                        message: `Nova Ordem de Compra #${po.po_number || 'N/A'} de ${po.buyer_name} aguardando sua aprovação. Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(po.total_value)}`,
                        link: `/admin/purchase-orders/${po.id}`, // Link to approval page
                        actor_id: po.user_id, // The requester is the actor
                        created_at: new Date().toISOString()
                    }));

                    const { error: notifError } = await supabaseAdmin
                        .from('notifications')
                        .insert(notificationsToInsert);

                    if (notifError) {
                        console.error('Failed to create in-portal notifications:', notifError);
                    } else {
                        console.log(`Created ${notificationsToInsert.length} in-portal notifications.`);
                    }
                }
            } catch (notifyErr) {
                console.error('Error in notification logic:', notifyErr);
            }
        }

        // 3. Generate PDF
        // @ts-ignore
        const pdfBuffer = await renderToBuffer(React.createElement(PurchaseOrderPdf, { data: po }));

        // 4. Prepare Attachments
        const attachments = [
            {
                filename: `OR_ABZ_${po.po_number || poId}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ];

        // 5. Fetch Invoice if exists
        if (po.invoice_url) {
            try {
                // Parse path from URL? 
                // URL format: https://.../storage/v1/object/public/purchase-orders/invoices/filename
                // We need the relative path: "invoices/filename"
                const urlObj = new URL(po.invoice_url);
                // Assuming standard supabase storage url structure.
                // We can likely just download it via fetch if it's public.

                const invoiceRes = await fetch(po.invoice_url);
                if (invoiceRes.ok) {
                    const invoiceBuffer = await invoiceRes.arrayBuffer();
                    const invoiceName = po.invoice_url.split('/').pop() || 'invoice';

                    attachments.push({
                        filename: invoiceName,
                        content: Buffer.from(invoiceBuffer),
                        contentType: invoiceRes.headers.get('content-type') || 'application/octet-stream'
                    });
                }
            } catch (err) {
                console.error('Failed to attach invoice:', err);
            }
        }

        // 7. Send Email
        const emailHtml = `
      <h2>Nova Ordem de Compra Recebida</h2>
      <p>Uma nova solicitação de compra foi criada e aguarda sua aprovação.</p>
      <ul>
        <li><strong>Número:</strong> ${po.po_number || 'N/A'}</li>
        <li><strong>Solicitante:</strong> ${po.buyer_name}</li>
        <li><strong>Valor Total:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(po.total_value)}</li>
      </ul>
      <p>Acesse o portal para aprovar ou rejeitar.</p>
      <hr />
      <p>Veja os detalhes no anexo.</p>
    `;

        // Only send if we have recipients
        if (approverEmails.length > 0) {
            await sendEmail({
                to: approverEmails,
                subject: `[Aprovação Pendente] ${po.po_number || 'OC'} - ${po.provider_name}`,
                html: emailHtml,
                attachments
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error processing PO email:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
