import { supabaseAdmin } from '@/lib/supabase';
import { sendGlobalNotification } from '@/lib/global-notifications';
import { sendEmail } from '@/lib/email-service';
import { baseTemplate } from '@/lib/emailTemplates';

import { getCredential } from '@/lib/secure-credentials';

async function getHrEmail() {
    const fromDb = await getCredential('HR_EMAIL');
    return fromDb || process.env.HR_EMAIL || 'rh@groupabz.com';
}
function formatPeriods(periods: any[], start_date: string, end_date: string) {
    if (periods && periods.length > 0) {
        return `<ul>${periods.map((p: any) => `<li>De <strong>${p.start_date}</strong> até <strong>${p.end_date}</strong> (${p.duration} dias)</li>`).join('')}</ul>`;
    }
    return `<p>Período: De <strong>${start_date}</strong> até <strong>${end_date}</strong></p>`;
}

export async function notifyLeaveRequestCreated(requestId: string) {
    const { data: req, error } = await supabaseAdmin
        .from('leave_requests')
        .select(`*, user:users_unified!inner(id, name, email, sector_id)`)
        .eq('id', requestId)
        .single();

    if (error || !req) {
        console.error('Error fetching request for created notification:', error);
        return;
    }

    const { user, start_date, end_date, justification, periods, status } = req;
    const periodsHtml = formatPeriods(periods, start_date, end_date);
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

    // 1. Notify Next Approver (if any)
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

        const approverHtml = baseTemplate(`
            <div style="color: #333;">
                <h2 style="color: #0056b3;">Aprovação Pendente: Férias de ${user.name}</h2>
                <p>Olá <strong>${nextApprover.name}</strong>,</p>
                <p>O(a) colaborador(a) <strong>${user.name}</strong> solicitou férias e aguarda sua aprovação.</p>
                <h3>Detalhes do Período:</h3>
                ${periodsHtml}
                ${justification ? `<p><strong>Observações:</strong> ${justification}</p>` : ''}
                <p>Por favor, acesse o portal para aprovar ou reprovar esta solicitação.</p>
            </div>
        `);

        await sendEmail(nextApprover.email, `Aprovação Pendente - Férias de ${user.name}`, `Aprovação de Férias`, approverHtml).catch(console.error);
    }

    // 2. Notify HR
    const hrHtml = baseTemplate(`
        <div style="color: #333;">
            <h2 style="color: #0056b3;">Nova Solicitação de Férias Registrada</h2>
            <p>O(a) colaborador(a) <strong>${user.name}</strong> registrou uma solicitação de férias.</p>
            <p><strong>Status Atual:</strong> ${status}</p>
            <h3>Detalhes do Período:</h3>
            ${periodsHtml}
            ${justification ? `<p><strong>Observações:</strong> ${justification}</p>` : ''}
        </div>
    `);

    const hrEmail = await getHrEmail();
    await sendEmail(hrEmail, `Nova Solicitação de Férias - ${user.name}`, `Férias de ${user.name}`, hrHtml).catch(console.error);

    // 3. Notify Requester
    if (user.email) {
        const requesterHtml = baseTemplate(`
            <div style="color: #333;">
                <h2 style="color: #0056b3;">Solicitação de Férias Recebida</h2>
                <p>Sua solicitação de férias foi registrada no sistema com sucesso.</p>
                <h3>Detalhes do Período:</h3>
                ${periodsHtml}
                <p>Sua solicitação será analisada pelos seus gestores. Você será notificado sobre a aprovação.</p>
            </div>
        `);

        await sendEmail(user.email, `Confirmação de Solicitação de Férias`, `Férias Solicitadas`, requesterHtml).catch(console.error);
    }
}

export async function triggerLeaveNotifications(requestId: string, newStatus: string, reason?: string) {
    const { data: req, error } = await supabaseAdmin
        .from('leave_requests')
        .select(`*, user:users_unified!inner(id, name, email, sector_id)`)
        .eq('id', requestId)
        .single();

    if (error || !req) return;

    const { user, start_date, end_date, periods } = req;
    const periodsHtml = formatPeriods(periods, start_date, end_date);

    if (newStatus === 'APPROVED') {
        // Notify Requester
        await sendGlobalNotification({
            userId: user.id,
            submodule: 'ferias',
            type: 'approved',
            title: 'Férias Aprovadas! 🎉',
            message: `Sua solicitação de férias do dia ${start_date} até ${end_date} foi aprovada.`,
            actionUrl: '/ferias',
            priority: 'normal',
            channels: ['in-app', 'email', 'push']
        });

        if (user.email) {
            const requesterHtml = baseTemplate(`
                <div style="color: #333;">
                    <h2 style="color: #28a745;">Férias Aprovadas! 🎉</h2>
                    <p>Olá <strong>${user.name}</strong>,</p>
                    <p>Sua solicitação de férias foi aprovada com sucesso! Aproveite seu descanso!</p>
                    <h3>Período Aprovado:</h3>
                    ${periodsHtml}
                </div>
            `);
            await sendEmail(user.email, `Férias Aprovadas!`, `Férias Aprovadas`, requesterHtml).catch(console.error);
        }


        // Notify HR
        const hrHtml = baseTemplate(`
            <div style="color: #333;">
                <h2 style="color: #28a745;">Férias Aprovadas: ${user.name}</h2>
                <p>A solicitação de férias de <strong>${user.name}</strong> foi totalmente aprovada pelos gestores.</p>
                <h3>Detalhes do Período:</h3>
                ${periodsHtml}
                <p>Por favor, providencie os trâmites legais e no sistema de RH.</p>
            </div>
        `);
        const hrEmail = await getHrEmail();
        await sendEmail(hrEmail, `Férias Aprovadas - ${user.name}`, `Férias Aprovadas`, hrHtml).catch(console.error);


    } else if (newStatus === 'REJECTED') {
        // Notify Requester
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
            const requesterHtml = baseTemplate(`
                <div style="color: #333;">
                    <h2 style="color: #dc3545;">Solicitação de Férias Rejeitada</h2>
                    <p>Olá <strong>${user.name}</strong>,</p>
                    <p>Informamos que sua solicitação de férias foi rejeitada.</p>
                    <h3>Detalhes da Solicitação:</h3>
                    ${periodsHtml}
                    <p><strong>Motivo da Rejeição:</strong> ${reason || 'Não informado'}</p>
                    <p>Em caso de dúvidas, converse com seu gestor.</p>
                </div>
            `);
            await sendEmail(user.email, `Solicitação de Férias Rejeitada`, `Férias Rejeitada`, requesterHtml).catch(console.error);
        }


        // Notify HR
        const hrHtml = baseTemplate(`
            <div style="color: #333;">
                <h2 style="color: #dc3545;">Solicitação de Férias Rejeitada: ${user.name}</h2>
                <p>A solicitação de férias de <strong>${user.name}</strong> foi rejeitada por um de seus gestores.</p>
                <h3>Detalhes do Período:</h3>
                ${periodsHtml}
                <p><strong>Motivo:</strong> ${reason || 'Não informado'}</p>
            </div>
        `);
        const hrEmail = await getHrEmail();
        await sendEmail(hrEmail, `Férias Rejeitada - ${user.name}`, `Férias Rejeitada`, hrHtml).catch(console.error);


    } else if (newStatus === 'PENDING_MANAGER') {
        // Leader approved, now manager needs to approve
        // Notify Manager
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
                const managerHtml = baseTemplate(`
                    <div style="color: #333;">
                        <h2 style="color: #0056b3;">Aprovação Final Pendente: Férias de ${user.name}</h2>
                        <p>Olá <strong>${mgr.name}</strong>,</p>
                        <p>A solicitação de férias de <strong>${user.name}</strong> foi aprovada pelo líder do setor e agora requer sua aprovação final (Gerente).</p>
                        <h3>Detalhes do Período:</h3>
                        ${periodsHtml}
                        <p>Por favor, acesse o portal para aprovar ou reprovar a solicitação.</p>
                    </div>
                `);
                await sendEmail(mgr.email, `Aprovação Pendente (Gerente) - Férias de ${user.name}`, `Aprovação de Férias`, managerHtml).catch(console.error);
            }

        }

        // Notify Requester
        if (user.email) {
            const requesterHtml = baseTemplate(`
                <div style="color: #333;">
                    <h2 style="color: #17a2b8;">Atualização: Solicitação de Férias</h2>
                    <p>Olá <strong>${user.name}</strong>,</p>
                    <p>Sua solicitação de férias avançou no fluxo. Ela foi aprovada pelo seu líder e agora está pendente de aprovação com o gerente da sua área.</p>
                    <h3>Detalhes do Período:</h3>
                    ${periodsHtml}
                </div>
            `);
            await sendEmail(user.email, `Atualização da sua Solicitação de Férias`, `Atualização de Férias`, requesterHtml).catch(console.error);
        }

    }
}
