/**
 * EPI Stock Low-Level Notification Service
 * Sends alerts to admins/managers when stock drops to or below minimum.
 */

import { supabaseAdmin } from '@/lib/db';
import { sendGlobalNotification } from '@/lib/global-notifications';
import { buildAppUrl } from '@/lib/app-url';

// Cache to avoid spamming — track which EPI types already had a notification sent recently
const recentNotifications = new Map<string, number>();
const NOTIFICATION_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between repeated alerts for same EPI type

/**
 * Check if stock is low and send notifications to all admins/managers.
 */
export async function checkAndNotifyLowStock(
    epiTypeId: string,
    currentQuantity: number,
    minimumQuantity: number
): Promise<void> {
    // Only notify if stock is at or below minimum
    if (currentQuantity > minimumQuantity) return;

    // Check cooldown to avoid spam
    const lastNotified = recentNotifications.get(epiTypeId);
    if (lastNotified && Date.now() - lastNotified < NOTIFICATION_COOLDOWN_MS) return;

    // Fetch EPI type name
    const { data: epiType } = await supabaseAdmin
        .from('epi_types')
        .select('name, category')
        .eq('id', epiTypeId)
        .single();

    const epiName = epiType?.name || 'EPI Desconhecido';
    const epiCategory = epiType?.category || '';

    // Fetch all registered EPI sector responsibles to notify
    const { data: responsibles, error } = await supabaseAdmin
        .from('epi_sector_responsibles')
        .select('user_id');

    if (error) {
        console.error('Error fetching EPI sector responsibles:', error);
    }

    // Deduplicate and map into the structure expected downstream ({ id: string }[])
    const uniqueUserIds = Array.from(new Set((responsibles || []).map(r => r.user_id).filter(Boolean)));
    const admins = uniqueUserIds.map(id => ({ id }));

    if (admins.length === 0) {
        console.warn('⚠️ No EPI responsibles found in the admin panel to notify about low stock');
        return;
    }

    // Determine severity
    const isOutOfStock = currentQuantity === 0;
    const priority = isOutOfStock ? 'urgent' as const : 'high' as const;
    const emoji = isOutOfStock ? '🚨' : '⚠️';

    const title = isOutOfStock
        ? `${emoji} Estoque Zerado: ${epiName}`
        : `${emoji} Estoque Baixo: ${epiName}`;

    const message = isOutOfStock
        ? `O EPI "${epiName}"${epiCategory ? ` (${epiCategory})` : ''} está sem estoque! Quantidade atual: 0. Mínimo recomendado: ${minimumQuantity}.`
        : `O EPI "${epiName}"${epiCategory ? ` (${epiCategory})` : ''} está com estoque baixo. Quantidade atual: ${currentQuantity}. Mínimo recomendado: ${minimumQuantity}.`;

    const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <div style="background: ${isOutOfStock ? '#FEE2E2' : '#FEF3C7'}; border-left: 4px solid ${isOutOfStock ? '#DC2626' : '#F59E0B'}; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: ${isOutOfStock ? '#DC2626' : '#D97706'}; margin: 0 0 8px 0;">${title}</h2>
                <p style="margin: 0; font-size: 16px;">${message}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 8px 12px; border: 1px solid #E5E7EB; font-weight: bold; background: #F9FAFB;">EPI</td>
                    <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${epiName}</td>
                </tr>
                ${epiCategory ? `<tr>
                    <td style="padding: 8px 12px; border: 1px solid #E5E7EB; font-weight: bold; background: #F9FAFB;">Categoria</td>
                    <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${epiCategory}</td>
                </tr>` : ''}
                <tr>
                    <td style="padding: 8px 12px; border: 1px solid #E5E7EB; font-weight: bold; background: #F9FAFB;">Quantidade Atual</td>
                    <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: ${isOutOfStock ? '#DC2626' : '#D97706'}; font-weight: bold;">${currentQuantity}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; border: 1px solid #E5E7EB; font-weight: bold; background: #F9FAFB;">Mínimo Recomendado</td>
                    <td style="padding: 8px 12px; border: 1px solid #E5E7EB;">${minimumQuantity}</td>
                </tr>
            </table>
            <div style="margin-top: 20px;">
                <a href="${buildAppUrl('/admin/epi')}" style="background-color: #0056b3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Gerenciar Estoque
                </a>
            </div>
            <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #888;">Portal ABZ - Alerta Automático de Estoque EPI</p>
        </div>
    `;

    // Send notification to each admin/manager
    const notificationPromises = admins.map(admin =>
        sendGlobalNotification({
            userId: admin.id,
            submodule: 'epi',
            type: isOutOfStock ? 'stock_out' : 'stock_low',
            title,
            message,
            data: {
                epi_type_id: epiTypeId,
                epi_name: epiName,
                current_quantity: currentQuantity,
                minimum_quantity: minimumQuantity,
            },
            actionUrl: '/admin/epi',
            priority,
            channels: ['in-app', 'email', 'push'],
            emailHtml,
        }).catch(err => {
            console.error(`❌ Failed to notify admin ${admin.id}:`, err);
        })
    );

    await Promise.allSettled(notificationPromises);

    // Update cooldown cache
    recentNotifications.set(epiTypeId, Date.now());

    console.log(`🔔 Low stock notification sent for "${epiName}" to ${admins.length} admin(s)`);
}
