import { supabaseAdmin } from '@/lib/supabase';
import { sendGlobalNotification } from '@/lib/global-notifications';
import { sendEmail } from '@/lib/email-service';
import {
    leaveRequestCreatedTemplate,
    leaveNewRequestNotificationTemplate,
    leaveApprovedTemplate,
    leaveApprovedNotificationTemplate,
    leaveRejectedTemplate,
    leaveRejectedNotificationTemplate,
    leavePendingManagerTemplate,
    leavePendingManagerNotificationTemplate,
    leaveApprovalPendingTemplate
} from '@/lib/emailTemplates';
import { getLeaveNotificationRecipients } from '@/lib/leaveConfig';

/**
 * Serviço de notificações do módulo de Férias.
 *
 * Princípios:
 * - TODOS os destinatários configurados (RH + lista adicional de e-mails do
 *   DP definida no painel admin) recebem notificação em TODAS as etapas do
 *   processo: nova solicitação, aprovação parcial (líder → gerente),
 *   aprovação final e rejeição.
 * - O colaborador solicitante recebe notificação em todas as etapas que
 *   afetam sua solicitação (criação, avanço, aprovação, rejeição).
 * - O líder/gerente recebe notificação apenas quando é a vez dele aprovar.
 * - Todos os e-mails seguem o padrão visual ABZ (baseTemplate com logo,
 *   header, footer e cores padronizadas) via templates formais em
 *   src/lib/emailTemplates.ts.
 */

/**
 * Helper: envia o mesmo email para múltiplos destinatários em paralelo.
 * Falha de um destinatário não bloqueia os demais.
 */
async function sendEmailToMultipleRecipients(
    recipients: string[],
    subject: string,
    textFallback: string,
    html: string
): Promise<void> {
    const uniqueRecipients = Array.from(new Set(recipients.filter(Boolean)));
    if (uniqueRecipients.length === 0) return;

    await Promise.all(
        uniqueRecipients.map(email =>
            sendEmail(email, subject, textFallback, html).catch(err =>
                console.error(`[Leave] Erro ao enviar email para ${email}:`, err)
            )
        )
    );
}

/**
 * Busca o nome do setor do usuário (se aplicável) para incluir nas
 * notificações ao RH/DP.
 */
async function getSectorName(sectorId: string | null | undefined): Promise<string | undefined> {
    if (!sectorId) return undefined;
    try {
        const { data } = await supabaseAdmin
            .from('sectors')
            .select('name')
            .eq('id', sectorId)
            .single();
        return (data as { name?: string } | null)?.name || undefined;
    } catch {
        return undefined;
    }
}

/**
 * Notificação disparada quando uma nova solicitação de férias é criada.
 *
 * Notifica:
 * 1. O próximo aprovador (líder ou gerente, conforme o status inicial)
 * 2. O RH + lista adicional de e-mails do DP (todos os destinatários
 *    configurados no painel admin)
 * 3. O colaborador solicitante
 */
export async function notifyLeaveRequestCreated(requestId: string) {
    const { data: req, error } = await supabaseAdmin
        .from('leave_requests')
        .select(`*, user:users_unified!inner(id, name, email, sector_id)`)
        .eq('id', requestId)
        .single();

    if (error || !req) {
        console.error('[Leave] Error fetching request for created notification:', error);
        return;
    }

    const { user, start_date, end_date, justification, periods, status } = req;
    let nextApprover: any = null;

    if (user.sector_id) {
        const { data: config } = await supabaseAdmin
            .from('leave_sector_configs')
            .select(`
                leader_id, manager_id,
                leader:users_unified!leave_sector_configs_leader_id_fkey(id, name, email),
                manager:users_unified!leave_sector_configs_manager_id_fkey(id, name, email)
            `)
            .eq('sector_id', user.sector_id)
            .single();

        const leader = Array.isArray(config?.leader) ? config.leader[0] : config?.leader;
        const manager = Array.isArray(config?.manager) ? config.manager[0] : config?.manager;

        if (status === 'PENDING_LEADER' && leader) {
            nextApprover = leader as any;
        } else if (status === 'PENDING_MANAGER' && manager) {
            nextApprover = manager as any;
        }
    }

    // 1. Notify Next Approver (if any) — usando template formal ABZ
    if (nextApprover && nextApprover.email) {
        await sendGlobalNotification({
            userId: nextApprover.id,
            submodule: 'ferias',
            type: 'new_request',
            title: 'Nova Solicitação de Férias',
            message: `${user.name} solicitou férias do dia ${start_date} até ${end_date}.`,
            actionUrl: '/admin/leave-approvals',
            priority: 'normal',
            channels: ['in-app', 'email', 'push']
        });

        const approvalStage: 'leader' | 'manager' = status === 'PENDING_LEADER' ? 'leader' : 'manager';
        const approverHtml = leaveApprovalPendingTemplate(
            nextApprover.name,
            user.name,
            periods,
            start_date,
            end_date,
            approvalStage,
            justification
        );

        await sendEmail(
            nextApprover.email,
            `Aprovação Pendente - Férias de ${user.name}`,
            `Aprovação de Férias`,
            approverHtml
        ).catch(err => console.error(`[Leave] Erro ao notificar aprovador ${nextApprover.email}:`, err));
    }

    // 2. Notify RH + lista adicional (DP e demais responsáveis)
    // Em TODAS as etapas do processo, todos os destinatários configurados
    // no painel admin são notificados.
    const sectorName = await getSectorName(user.sector_id);
    const hrAndExtras = await getLeaveNotificationRecipients();

    if (hrAndExtras.length > 0) {
        const notificationHtml = leaveNewRequestNotificationTemplate(
            user.name,
            user.email,
            sectorName,
            periods,
            start_date,
            end_date,
            status,
            justification
        );

        await sendEmailToMultipleRecipients(
            hrAndExtras,
            `Nova Solicitação de Férias - ${user.name}`,
            `Nova Solicitação de Férias - ${user.name}`,
            notificationHtml
        );

        console.log(`[Leave] Nova solicitação notificada para: ${hrAndExtras.join(', ')}`);
    }

    // 3. Notify Requester — usando template formal ABZ
    if (user.email) {
        const requesterHtml = leaveRequestCreatedTemplate(
            user.name,
            periods,
            start_date,
            end_date,
            justification
        );

        await sendEmail(
            user.email,
            `Confirmação de Solicitação de Férias`,
            `Férias Solicitadas`,
            requesterHtml
        ).catch(err => console.error(`[Leave] Erro ao notificar solicitante ${user.email}:`, err));
    }
}

/**
 * Dispara notificações quando o status de uma solicitação muda.
 *
 * Garante que o RH + lista adicional (DP) sejam notificados em TODAS as
 * mudanças de status, junto com o colaborador e o próximo aprovador
 * (quando aplicável).
 */
export async function triggerLeaveNotifications(requestId: string, newStatus: string, reason?: string) {
    const { data: req, error } = await supabaseAdmin
        .from('leave_requests')
        .select(`*, user:users_unified!inner(id, name, email, sector_id)`)
        .eq('id', requestId)
        .single();

    if (error || !req) return;

    const { user, start_date, end_date, periods } = req;
    const pecuniaryAllowance = !!req.pecuniary_allowance;
    const advance13thSalary = !!req.advance_13th_salary;

    // Destinatários globais (RH + lista adicional do DP) — notificados em
    // TODAS as etapas.
    const hrAndExtras = await getLeaveNotificationRecipients();

    if (newStatus === 'APPROVED') {
        // 1. Notify Requester (in-app + email)
        await sendGlobalNotification({
            userId: user.id,
            submodule: 'ferias',
            type: 'approved',
            title: 'Férias Aprovadas! 🎉',
            message: `Sua solicitação de férias do dia ${start_date} até ${end_date} foi aprovada e está programada conforme solicitado.`,
            actionUrl: '/ferias',
            priority: 'normal',
            channels: ['in-app', 'email', 'push']
        });

        if (user.email) {
            const periodsText = (periods && periods.length > 0)
                ? periods.map((p: any) => `${p.start_date} a ${p.end_date} (${p.duration} dias)`).join(' | ')
                : `${start_date} a ${end_date}`;

            const requesterHtml = leaveApprovedTemplate(
                user.name,
                periods,
                start_date,
                end_date,
                { pecuniaryAllowance, advance13thSalary }
            );
            await sendEmail(
                user.email,
                `Férias Aprovadas e Programadas (${periodsText})`,
                `Férias Aprovadas`,
                requesterHtml
            ).catch(err => console.error(`[Leave] Erro ao notificar solicitante ${user.email}:`, err));
        }

        // 2. Notify RH + lista adicional (DP) — também na aprovação final
        if (hrAndExtras.length > 0) {
            const notificationHtml = leaveApprovedNotificationTemplate(
                user.name,
                periods,
                start_date,
                end_date,
                { pecuniaryAllowance, advance13thSalary }
            );
            await sendEmailToMultipleRecipients(
                hrAndExtras,
                `Férias Aprovadas - ${user.name}`,
                `Férias Aprovadas`,
                notificationHtml
            );
            console.log(`[Leave] Aprovação notificada para: ${hrAndExtras.join(', ')}`);
        }

    } else if (newStatus === 'REJECTED') {
        // 1. Notify Requester (in-app + email)
        await sendGlobalNotification({
            userId: user.id,
            submodule: 'ferias',
            type: 'rejected',
            title: 'Solicitação de Férias Rejeitada',
            message: `Sua solicitação de férias (De ${start_date} até ${end_date}) foi rejeitada. Motivo: ${reason || 'Não informado'}`,
            actionUrl: '/ferias',
            priority: 'high',
            channels: ['in-app', 'email', 'push']
        });

        if (user.email) {
            const requesterHtml = leaveRejectedTemplate(
                user.name,
                periods,
                start_date,
                end_date,
                reason
            );
            await sendEmail(
                user.email,
                `Solicitação de Férias Rejeitada`,
                `Férias Rejeitada`,
                requesterHtml
            ).catch(err => console.error(`[Leave] Erro ao notificar solicitante ${user.email}:`, err));
        }

        // 2. Notify RH + lista adicional (DP) — também na rejeição
        if (hrAndExtras.length > 0) {
            const notificationHtml = leaveRejectedNotificationTemplate(
                user.name,
                periods,
                start_date,
                end_date,
                reason
            );
            await sendEmailToMultipleRecipients(
                hrAndExtras,
                `Férias Rejeitada - ${user.name}`,
                `Férias Rejeitada`,
                notificationHtml
            );
            console.log(`[Leave] Rejeição notificada para: ${hrAndExtras.join(', ')}`);
        }

    } else if (newStatus === 'PENDING_MANAGER') {
        // Líder aprovou, agora gerente precisa aprovar

        // 1. Notify Manager (in-app + email)
        const { data: config } = await supabaseAdmin
            .from('leave_sector_configs')
            .select(`manager_id, manager:users_unified!leave_sector_configs_manager_id_fkey(id, name, email)`)
            .eq('sector_id', user.sector_id)
            .single();

        const manager = Array.isArray(config?.manager) ? config.manager[0] : config?.manager;

        if (manager) {
            const mgr = manager as any;
            await sendGlobalNotification({
                userId: mgr.id,
                submodule: 'ferias',
                type: 'pending_approval',
                title: 'Aprovação Pendente: Férias',
                message: `O líder aprovou as férias de ${user.name}. Agora aguarda sua aprovação final como gerente.`,
                actionUrl: '/admin/leave-approvals',
                priority: 'normal',
                channels: ['in-app', 'email', 'push']
            });

            if (mgr.email) {
                const managerHtml = leaveApprovalPendingTemplate(
                    mgr.name,
                    user.name,
                    periods,
                    start_date,
                    end_date,
                    'manager',
                    req.justification
                );
                await sendEmail(
                    mgr.email,
                    `Aprovação Pendente (Gerente) - Férias de ${user.name}`,
                    `Aprovação de Férias`,
                    managerHtml
                ).catch(err => console.error(`[Leave] Erro ao notificar gerente ${mgr.email}:`, err));
            }
        }

        // 2. Notify Requester (avançou no fluxo)
        if (user.email) {
            const requesterHtml = leavePendingManagerTemplate(
                user.name,
                periods,
                start_date,
                end_date
            );
            await sendEmail(
                user.email,
                `Atualização da sua Solicitação de Férias`,
                `Atualização de Férias`,
                requesterHtml
            ).catch(err => console.error(`[Leave] Erro ao notificar solicitante ${user.email}:`, err));
        }

        // 3. Notify RH + lista adicional (DP) — também no avanço do fluxo
        if (hrAndExtras.length > 0) {
            const notificationHtml = leavePendingManagerNotificationTemplate(
                user.name,
                periods,
                start_date,
                end_date
            );
            await sendEmailToMultipleRecipients(
                hrAndExtras,
                `Atualização de Férias - ${user.name}`,
                `Atualização de Férias`,
                notificationHtml
            );
            console.log(`[Leave] Avanço de fluxo notificado para: ${hrAndExtras.join(', ')}`);
        }
    }
}
