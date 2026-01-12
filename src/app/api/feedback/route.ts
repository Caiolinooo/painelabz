import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Aumentar limite do body para suportar screenshots
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb'
        }
    }
};

interface ConsoleLog {
    type: 'log' | 'warn' | 'error' | 'info';
    message: string;
    timestamp: string;
}

interface BrowserInfo {
    language: string;
    languages?: string;
    platform: string;
    cookiesEnabled: boolean;
    onLine: boolean;
    deviceMemory?: string | number;
    hardwareConcurrency?: string | number;
    colorDepth?: number;
    pixelRatio?: number;
    timezone?: string;
    pageLoadTime?: number;
    domContentLoaded?: number;
    timeToFirstByte?: number;
    memoryUsage?: string;
    timestamp: string;
}

interface Attachment {
    name: string;
    type: string;
    data: string;
    size: number;
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        let userId = null;

        // Tentar extrair user do token se disponível
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const { verifyToken } = await import('@/lib/auth');
                const decoded = verifyToken(token);
                if (decoded && typeof decoded === 'object') {
                    userId = (decoded as any).userId;
                }
            } catch (e) {
                console.warn('Erro ao extrair user do token feedback:', e);
            }
        }

        const body = await request.json();
        const {
            type,
            message,
            url,
            userAgent,
            screenResolution,
            userName,
            userEmail,
            consoleLogs,
            browserInfo,
            screenshot,
            attachments
        } = body as {
            type: string;
            message: string;
            url: string;
            userAgent: string;
            screenResolution: string;
            userName?: string;
            userEmail?: string;
            consoleLogs?: ConsoleLog[];
            browserInfo?: BrowserInfo;
            screenshot?: string;
            attachments?: Attachment[];
        };

        // Buscar nome do usuário do banco se temos userId
        let displayName = userName || 'Desconhecido';
        let displayEmail = userEmail || '';

        if (userId) {
            const { data: userData } = await supabaseAdmin
                .from('users_unified')
                .select('name, email')
                .eq('id', userId)
                .single();

            if (userData) {
                displayName = userData.name || displayName;
                displayEmail = userData.email || displayEmail;
            }
        }

        // Salvar no banco com todos os dados adicionais
        const { error } = await supabaseAdmin
            .from('user_feedback')
            .insert({
                user_id: userId,
                type,
                message,
                url,
                user_agent: userAgent,
                screen_resolution: screenResolution,
                user_name: displayName,
                user_email: displayEmail,
                console_logs: consoleLogs || [],
                browser_info: browserInfo || {},
                screenshot_url: screenshot || null,
                attachments: attachments || []
            });

        if (error) {
            console.error('Erro ao salvar feedback:', error);
            return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
        }

        // Cores e ícones baseados no tipo
        const typeConfig: Record<string, { color: string; bgColor: string; emoji: string; label: string }> = {
            doubt: { color: '#2563eb', bgColor: '#dbeafe', emoji: '❓', label: 'Dúvida' },
            bug: { color: '#dc2626', bgColor: '#fee2e2', emoji: '🐛', label: 'Erro/Bug' },
            suggestion: { color: '#16a34a', bgColor: '#dcfce7', emoji: '💡', label: 'Sugestão' },
            other: { color: '#6b7280', bgColor: '#f3f4f6', emoji: '📝', label: 'Outro' }
        };

        const config = typeConfig[type] || typeConfig.other;
        const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        // Formatar logs do console para HTML
        let consoleLogsHtml = '';
        if (consoleLogs && consoleLogs.length > 0) {
            const logsFormatted = consoleLogs.slice(0, 10).map(log => {
                const logColor = log.type === 'error' ? '#dc2626' : log.type === 'warn' ? '#d97706' : '#6b7280';
                const logTime = new Date(log.timestamp).toLocaleTimeString('pt-BR');
                return `<div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-left: 3px solid ${logColor}; border-radius: 4px; font-family: monospace; font-size: 12px;">
                    <span style="color: ${logColor}; font-weight: bold;">[${log.type.toUpperCase()}]</span> 
                    <span style="color: #6b7280;">${logTime}</span><br/>
                    <span style="color: #374151; word-break: break-all;">${escapeHtml(log.message.slice(0, 300))}</span>
                </div>`;
            }).join('');

            consoleLogsHtml = `
                <div style="margin-top: 24px; padding: 16px; background: #1f2937; border-radius: 8px;">
                    <h3 style="color: #f9fafb; margin: 0 0 12px 0; font-size: 14px;">🖥️ Logs do Console (${consoleLogs.length})</h3>
                    ${logsFormatted}
                    ${consoleLogs.length > 10 ? `<p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">...e mais ${consoleLogs.length - 10} logs</p>` : ''}
                </div>
            `;
        }

        // Formatar informações do navegador
        let browserInfoHtml = '';
        if (browserInfo) {
            browserInfoHtml = `
                <div style="margin-top: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                    <h4 style="color: #374151; margin: 0 0 8px 0; font-size: 13px;">🌐 Informações do Navegador</h4>
                    <table style="width: 100%; font-size: 12px; color: #6b7280;">
                        <tr><td style="padding: 4px 8px 4px 0;"><strong>Idioma:</strong></td><td>${browserInfo.language}</td></tr>
                        <tr><td style="padding: 4px 8px 4px 0;"><strong>Plataforma:</strong></td><td>${browserInfo.platform}</td></tr>
                        <tr><td style="padding: 4px 8px 4px 0;"><strong>Cookies:</strong></td><td>${browserInfo.cookiesEnabled ? '✅' : '❌'}</td></tr>
                        <tr><td style="padding: 4px 8px 4px 0;"><strong>Online:</strong></td><td>${browserInfo.onLine ? '✅' : '❌'}</td></tr>
                        <tr><td style="padding: 4px 8px 4px 0;"><strong>Resolução:</strong></td><td>${screenResolution}</td></tr>
                        ${browserInfo.deviceMemory ? `<tr><td style="padding: 4px 8px 4px 0;"><strong>Memória:</strong></td><td>${browserInfo.deviceMemory}GB</td></tr>` : ''}
                        ${browserInfo.pageLoadTime ? `<tr><td style="padding: 4px 8px 4px 0;"><strong>Tempo de Carregamento:</strong></td><td>${browserInfo.pageLoadTime}ms</td></tr>` : ''}
                        ${browserInfo.timezone ? `<tr><td style="padding: 4px 8px 4px 0;"><strong>Timezone:</strong></td><td>${browserInfo.timezone}</td></tr>` : ''}
                    </table>
                </div>
            `;
        }

        // Info de anexos
        let attachmentsHtml = '';
        if (attachments && attachments.length > 0) {
            attachmentsHtml = `
                <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px;">
                    <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 13px;">📎 Anexos (${attachments.length})</h4>
                    <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #78350f;">
                        ${attachments.map(a => `<li>${escapeHtml(a.name)} (${Math.round(a.size / 1024)}KB)</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Screenshot info
        let screenshotHtml = '';
        if (screenshot) {
            screenshotHtml = `
                <div style="margin-top: 16px; padding: 12px; background: #ecfdf5; border-radius: 8px;">
                    <h4 style="color: #065f46; margin: 0 0 8px 0; font-size: 13px;">📷 Screenshot Capturado</h4>
                    <p style="font-size: 12px; color: #047857; margin: 0;">Uma captura de tela foi incluída neste feedback. Acesse o painel para visualizar.</p>
                </div>
            `;
        }

        // Template de email
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 8px;">${config.emoji}</div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Novo Feedback: ${config.label}</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">${timestamp}</p>
        </div>
        
        <!-- Content -->
        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- User Info -->
            <div style="display: flex; align-items: center; margin-bottom: 20px; padding: 16px; background: ${config.bgColor}; border-radius: 8px; border-left: 4px solid ${config.color};">
                <div style="width: 48px; height: 48px; background: ${config.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
                    <span style="color: white; font-size: 20px; font-weight: bold;">${displayName.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                    <div style="font-weight: 600; color: #1f2937; font-size: 16px;">${escapeHtml(displayName)}</div>
                    <div style="color: #6b7280; font-size: 13px;">${escapeHtml(displayEmail)}</div>
                    ${userId ? `<div style="color: #9ca3af; font-size: 11px; font-family: monospace;">ID: ${userId}</div>` : ''}
                </div>
            </div>
            
            <!-- Message -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 14px;">💬 Mensagem</h3>
                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; color: #1f2937; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</div>
            </div>
            
            <!-- URL -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 14px;">🔗 Página</h3>
                <a href="${url}" style="color: ${config.color}; text-decoration: none; word-break: break-all; font-size: 13px;">${escapeHtml(url)}</a>
            </div>
            
            <!-- User Agent -->
            <div style="margin-bottom: 16px;">
                <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 14px;">📱 Dispositivo</h3>
                <div style="color: #6b7280; font-size: 12px; background: #f9fafb; padding: 12px; border-radius: 6px; word-break: break-all;">${escapeHtml(userAgent)}</div>
            </div>
            
            ${browserInfoHtml}
            ${screenshotHtml}
            ${attachmentsHtml}
            ${consoleLogsHtml}
            
            <!-- Footer -->
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.groupabz.com'}/admin/feedback" 
                   style="display: inline-block; background: ${config.color}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px;">
                    📋 Ver no Painel de Feedback
                </a>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">ABZ Group Portal • Sistema de Feedback</p>
        </div>
    </div>
</body>
</html>
        `;

        // Enviar email para admins
        try {
            const { data: admins } = await supabaseAdmin
                .from('users_unified')
                .select('email')
                .in('role', ['ADMIN', 'MANAGER', 'SUPPORT'])
                .eq('active', true);

            if (admins && admins.length > 0) {
                const { sendCustomEmail } = await import('@/lib/notifications');
                const subject = `${config.emoji} Novo Feedback: ${config.label} - ${displayName}`;

                // Enviar sequencialmente com delay
                const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
                for (const admin of admins) {
                    if (admin.email) {
                        try {
                            await sendCustomEmail(admin.email, subject, htmlContent);
                            await delay(500);
                        } catch (emailErr) {
                            console.error(`Erro ao enviar email para ${admin.email}:`, emailErr);
                        }
                    }
                }
            }
        } catch (mailError) {
            console.error('Falha ao enviar emails de feedback:', mailError);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Feedback Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Função auxiliar para escapar HTML
function escapeHtml(text: string): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
