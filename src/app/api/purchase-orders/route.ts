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
                const { getTranslation } = await import('@/i18n'); // Import dynamic translator

                // Get locale or default to pt-BR
                let userLocale = request.headers.get('x-client-locale');
                const acceptLanguage = request.headers.get('accept-language');

                if (!userLocale && acceptLanguage) {
                    // Extract first language from Accept-Language header
                    userLocale = acceptLanguage.split(',')[0].trim();
                    console.log(`PO Create: Fallback to Accept-Language '${userLocale}'`);
                }

                userLocale = userLocale || 'pt-BR';
                console.log(`PO Create: Final locale determined '${userLocale}'`);

                const t = (key: string, locale: string, params?: any) => getTranslation(locale as any, key, undefined, params);

                const poNumber = data.po_number || '#' + data.id.slice(0, 8);
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://painel.abzgroup.com.br';
                const viewUrl = `${appUrl}/department/purchase-orders/${data.id}`;

                // 2. Email the Requester (Confirmation)
                if (user.email) {
                    const htmlUser = purchaseOrderCreatedTemplate(
                        user.name || 'Colaborador',
                        poNumber,
                        body.provider_name,
                        body.total_value,
                        body.items?.length || 0,
                        viewUrl,
                        data.invoice_url,
                        userLocale
                    );
                    await sendEmail(
                        user.email,
                        t('emails.purchaseOrder.subject.created', userLocale, { number: poNumber }),
                        t('emails.purchaseOrder.createdMessage', userLocale),
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

                // Send to Calculated Approvers
                for (const email of approversToNotify) {
                    // Fetch Approver Name
                    let approverName = 'Aprovador';
                    try {
                        const { data: approverData } = await supabaseAdmin
                            .from('users_unified')
                            .select('name')
                            .eq('email', email)
                            .maybeSingle();
                        if (approverData?.name) {
                            approverName = approverData.name.split(' ')[0]; // Use first name
                        }
                    } catch (e) {
                        console.error('Error fetching approver name', e);
                    }

                    // For approvers, we ideally should use their preferred locale, but for now we fallback to requester's or default
                    // In a perfect world we would fetch the approver's profile preference
                    const approverLocale = userLocale;

                    const htmlApprover = poApprovalRequestTemplate(
                        approverName,
                        user.name || 'Colaborador',
                        poNumber,
                        body.provider_name,
                        body.total_value,
                        body.items?.length || 0,
                        viewUrl,
                        data.invoice_url,
                        approverLocale
                    );

                    await sendEmail(
                        email,
                        t('emails.purchaseOrder.subject.approval', approverLocale, { number: poNumber }),
                        t('emails.purchaseOrder.approvalMessage', approverLocale, { name: user.name || 'Colaborador' }),
                        htmlApprover
                    );
                }

                // Send to CC (Karla)
                for (const email of CC_EMAILS) {
                    // Avoid sending double if Karla is also an approver
                    if (!approversToNotify.includes(email)) {
                        const htmlApprover = poApprovalRequestTemplate(
                            'Aprovador', // Generic for CC
                            user.name || 'Colaborador',
                            poNumber,
                            body.provider_name,
                            body.total_value,
                            body.items?.length || 0,
                            viewUrl,
                            data.invoice_url,
                            userLocale
                        );

                        await sendEmail(
                            email,
                            t('emails.purchaseOrder.subject.approvalCopy', userLocale, { number: poNumber }),
                            t('emails.purchaseOrder.approvalMessage', userLocale, { name: user.name || 'Colaborador' }),
                            htmlApprover
                        );
                    }
                }

                // 4. Create IN-APP Notifications
                try {
                    // Notify requester
                    await supabaseAdmin
                        .from('notifications')
                        .insert({
                            user_id: payload.userId,
                            type: 'purchase_order',
                            title: 'Ordem de Compra Criada',
                            message: `Sua OC ${poNumber} para ${body.provider_name} foi criada e aguarda aprovação.`,
                            link: viewUrl,
                            resource_id: data.id,
                            metadata: {
                                type: 'po_created',
                                provider: body.provider_name,
                                value: body.total_value,
                                poNumber: poNumber
                            },
                            created_at: new Date().toISOString()
                        });

                    // Notify approvers (in-app)
                    for (const approverEmail of approversToNotify) {
                        const { data: approverData } = await supabaseAdmin
                            .from('users_unified')
                            .select('id')
                            .eq('email', approverEmail)
                            .maybeSingle();

                        if (approverData?.id) {
                            await supabaseAdmin
                                .from('notifications')
                                .insert({
                                    user_id: approverData.id,
                                    type: 'purchase_order',
                                    title: 'Nova Ordem de Compra',
                                    message: `${user.name || 'Colaborador'} criou uma OC de R$ ${Number(body.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} que aguarda sua aprovação.`,
                                    link: viewUrl,
                                    resource_id: data.id,
                                    actor_id: payload.userId,
                                    metadata: {
                                        type: 'po_approval_request',
                                        provider: body.provider_name,
                                        value: body.total_value,
                                        poNumber: poNumber
                                    },
                                    created_at: new Date().toISOString()
                                });
                        }
                    }
                    console.log('✅ PO in-app notifications sent successfully');
                } catch (notifError) {
                    console.error('Failed to send PO in-app notifications:', notifError);
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
