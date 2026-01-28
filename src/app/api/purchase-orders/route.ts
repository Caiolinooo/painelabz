import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        let token = extractTokenFromHeader(authHeader || undefined);

        if (!token) {
            token = request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value || null;
        }

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = payload.userId;
        const role = payload.role?.toUpperCase() || 'USER';

        let query = supabaseAdmin
            .from('purchase_orders')
            .select('*')
            .order('created_at', { ascending: false });

        // RBAC Logic
        if (role === 'ADMIN') {
            // See all - no filter
        } else if (role === 'MANAGER') {
            // See own orders OR assigned orders
            query = query.or(`user_id.eq.${userId},manager_id.eq.${userId}`);
        } else {
            // Regular user - see own only
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching POs:', error);
            throw error;
        }

        return NextResponse.json({ data });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        let token = extractTokenFromHeader(authHeader || undefined);

        if (!token) {
            token = request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value || null;
        }

        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = verifyToken(token);
        if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

        const body = await request.json();

        // Validate required fields (basic validation)
        if (!body.provider_name || !body.total_value) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('purchase_orders')
            .insert({
                ...body,
                user_id: payload.userId, // Force user_id to current user
                status: 'submitted', // Default status
                history: [{
                    action: 'created',
                    user_id: payload.userId,
                    date: new Date().toISOString()
                }]
            })
            .select()
            .single();

        if (error) throw error;

        // Send confirmation email asynchronously
        // Send confirmation email and notification to approvers
        (async () => {
            try {
                // 1. Fetch User details
                const { data: user } = await supabaseAdmin
                    .from('users_unified')
                    .select('name, email, sector_id')
                    .eq('id', payload.userId)
                    .single();

                if (!user) return;

                const { sendEmail } = await import('@/lib/email-exchange');
                const { purchaseOrderCreatedTemplate, poApprovalRequestTemplate } = await import('@/lib/emailTemplates');

                const poNumber = data.po_number || '#' + data.id.slice(0, 8);
                const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/department/purchase-orders/${data.id}`;

                // 2. Email the Requester (Confirmation)
                if (user.email) {
                    const htmlUser = purchaseOrderCreatedTemplate(
                        user.name || 'Colaborador',
                        poNumber,
                        body.provider_name,
                        body.total_value,
                        body.items?.length || 0,
                        viewUrl,
                        data.invoice_url
                    );
                    await sendEmail(
                        user.email,
                        `Ordem de Compra Criada - ${poNumber}`,
                        'Sua ordem de compra foi criada com sucesso.',
                        htmlUser
                    );
                }

                // 3. Email Approvers (Dynamic based on Tiered Rules)
                let approversToNotify: string[] = [];

                // Fetch User's Sector Config to find Approvers
                if (user.sector_id) {
                    const { data: config } = await supabaseAdmin
                        .from('purchase_order_configs')
                        .select('approval_rules, approver_emails')
                        .eq('sector_id', user.sector_id)
                        .maybeSingle();

                    if (config) {
                        const rules = config.approval_rules as { email: string, limit: number }[] || [];
                        const poValue = Number(body.total_value);

                        if (rules.length > 0) {
                            // Sort by limit ascending
                            rules.sort((a, b) => a.limit - b.limit);

                            // Find the first rule that covers this value
                            const applicableRule = rules.find(r => r.limit >= poValue);

                            if (applicableRule) {
                                approversToNotify.push(applicableRule.email);
                            } else {
                                // Value exceeds all limits? Notify the highest tier (last one)
                                // or maybe notify all? Usually highest tier.
                                const highestRule = rules[rules.length - 1];
                                if (highestRule) approversToNotify.push(highestRule.email);
                            }
                        } else if (config.approver_emails && config.approver_emails.length > 0) {
                            // Fallback to legacy list
                            approversToNotify = config.approver_emails;
                        }
                    }
                }

                // Fallback if no configuration found at all (Default Directors)
                if (approversToNotify.length === 0) {
                    approversToNotify = ['gordon@groupabz.com', 'william@groupabz.com'];
                }

                // Filter valid emails and remove duplicates
                approversToNotify = [...new Set(approversToNotify.filter(e => e && e.includes('@')))];
                const CC_EMAILS = ['karla@groupabz.com'];

                const htmlApprover = poApprovalRequestTemplate(
                    'Aprovador',
                    user.name || 'Colaborador',
                    poNumber,
                    body.provider_name,
                    body.total_value,
                    body.items?.length || 0,
                    viewUrl,
                    data.invoice_url
                );

                // Send to Calculated Approvers
                for (const email of approversToNotify) {
                    await sendEmail(
                        email,
                        `Aprovação Necessária - OC ${poNumber}`,
                        `Nova solicitação de compra de ${user.name} (Valor: R$ ${body.total_value}).`,
                        htmlApprover
                    );
                }

                // Send to CC (Karla)
                for (const email of CC_EMAILS) {
                    // Avoid sending double if Karla is also an approver
                    if (!approversToNotify.includes(email)) {
                        await sendEmail(
                            email,
                            `Nova OC Criada (Cópia) - ${poNumber}`,
                            `Cópia de solicitação de compra de ${user.name}.`,
                            htmlApprover
                        );
                    }
                }

            } catch (emailError) {
                console.error('Failed to send PO emails:', emailError);
            }
        })();

        return NextResponse.json({ data, success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
