import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email-service';
import { sendPushToUserIds } from '@/lib/push';

export type NotificationChannel = 'in-app' | 'email' | 'push';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationPayload {
    userId: string;
    submodule: string; // e.g., 'evaluation', 'system', 'chat'
    type: string; // e.g., 'period_opened', 'approval'
    title: string;
    message: string;
    data?: any;
    actionUrl?: string;
    priority?: NotificationPriority;
    channels?: NotificationChannel[];
    emailHtml?: string; // Optional custom HTML for email
}

/**
 * Global Notification Service
 * Handles sending notifications across multiple channels (In-App, Email, Push)
 */
export async function sendGlobalNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    results: Record<NotificationChannel, boolean>;
}> {
    const {
        userId,
        submodule,
        type,
        title,
        message,
        data,
        actionUrl,
        priority = 'normal',
        channels = ['in-app', 'email'], // Default channels
        emailHtml
    } = payload;

    const results: Record<NotificationChannel, boolean> = {
        'in-app': false,
        'email': false,
        'push': false
    };

    console.log(`🔔 Sending global notification [${submodule}:${type}] to user ${userId}`);

    // 1. In-App Notification (Supabase)
    if (channels.includes('in-app')) {
        try {
            const notificationData = {
                user_id: userId,
                type: submodule, // Using submodule as the main type in DB for filtering
                title,
                message,
                data: ***REMOVED*** ...data, sub_type: type }), // Store specific type in data
                action_url: actionUrl,
                priority,
                read: false,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                created_at: new Date().toISOString()
            };

            // Try RPC first (bypass RLS), then fallback to direct insert
            try {
                const { error } = await supabaseAdmin.rpc('create_notification_bypass_rls', {
                    p_user_id: userId,
                    p_type: submodule,
                    p_title: title,
                    p_message: message,
                    p_data: notificationData.data,
                    p_action_url: actionUrl,
                    p_priority: priority,
                    p_expires_at: notificationData.expires_at
                });
                if (error) throw error;
                results['in-app'] = true;
            } catch (rpcError) {
                // Fallback to direct insert
                const { error } = await supabaseAdmin
                    .from('notifications')
                    .insert(notificationData);

                if (error) throw error;
                results['in-app'] = true;
            }
        } catch (error) {
            console.error('❌ Failed to send in-app notification:', error);
        }
    }

    // 2. Email Notification
    if (channels.includes('email')) {
        try {
            // Fetch user email if not provided in payload (assuming we might optimize this later)
            const { data: user, error } = await supabaseAdmin
                .from('users_unified')
                .select('email, first_name')
                .eq('id', userId)
                .single();

            if (user && user.email) {
                const htmlContent = emailHtml || `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #0056b3;">${title}</h2>
            <p style="font-size: 16px;">${message}</p>
            ${actionUrl ? `
              <div style="margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}${actionUrl}" style="***REMOVED*** #0056b3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  Ver Detalhes
                </a>
              </div>
            ` : ''}
            <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #888;">Portal ABZ - Notificação Automática</p>
          </div>
        `;

                await sendEmail(user.email, title, message, htmlContent);
                results['email'] = true;
            } else {
                console.warn(`⚠️ User ${userId} has no email or not found.`);
            }
        } catch (error) {
            console.error('❌ Failed to send email notification:', error);
        }
    }

    // 3. Push Notification
    if (channels.includes('push')) {
        try {
            await sendPushToUserIds([userId], {
                title,
                body: message,
                url: actionUrl
            });
            results['push'] = true;
        } catch (error) {
            console.warn('⚠️ Failed to send push notification (optional):', error);
        }
    }

    return {
        success: results['in-app'] || results['email'], // Consider success if at least one critical channel worked
        results
    };
}
