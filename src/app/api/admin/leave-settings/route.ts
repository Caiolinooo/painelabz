import { NextResponse } from 'next/server';
import { getLeaveSectorConfigs, upsertLeaveSectorConfig } from '@/services/leaveService';
import { supabaseAdmin } from '@/lib/db';
import { clearCredentialCache } from '@/lib/secure-credentials';
import {
    LEAVE_ADVANCE_NOTICE_DAYS_KEY,
    CARLOS_GALLO_EMAIL_KEY,
    LEAVE_EXTRA_NOTIFY_EMAILS_KEY,
    DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS
} from '@/lib/leaveConfig';

export const dynamic = 'force-dynamic';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

function getAuthPayload(request: Request) {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    return payload;
}

/**
 * Helper: lê uma credencial da tabela app_secrets.
 * Não usa cache para garantir leitura sempre fresca das configurações admin.
 */
async function readSecret(key: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
        .from('app_secrets')
        .select('value')
        .eq('key', key)
        .single();

    if (error || !data) return null;
    return (data as { value: string }).value || null;
}

/**
 * Helper: faz upsert de uma credencial na tabela app_secrets.
 * Limpa o cache após a escrita para que as próximas leituras (via
 * getCredential) vejam o novo valor.
 */
async function upsertSecret(key: string, value: string, description: string): Promise<void> {
    const { data: existing } = await supabaseAdmin
        .from('app_secrets')
        .select('id')
        .eq('key', key)
        .single();

    let error: any = null;
    if (existing) {
        const result = await supabaseAdmin
            .from('app_secrets')
            .update({ value })
            .eq('key', key);
        error = result.error;
    } else {
        const result = await supabaseAdmin
            .from('app_secrets')
            .insert([{
                key,
                value,
                description,
                is_encrypted: false
            }]);
        error = result.error;
    }

    if (error) throw error;

    // Limpa o cache para que getCredential busque o novo valor
    clearCredentialCache(key);
}

/**
 * Helper: valida que uma string é um email razoável.
 */
function isValidEmail(email: string): boolean {
    return !!email && email.includes('@') && email.length >= 5;
}

/**
 * Helper: normaliza uma lista de emails separados por vírgula em uma string
 * limpa (sem espaços extras, sem emails vazios, sem duplicatas).
 * Retorna null se a entrada for vazia.
 */
function normalizeEmailList(input: string): string | null {
    if (!input || !input.trim()) return null;
    const list = input
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);
    if (list.length === 0) return null;
    // Remove duplicatas mantendo ordem
    const unique = Array.from(new Set(list));
    return unique.join(',');
}

export async function GET(request: Request) {
    const payload = getAuthPayload(request);
    if (!payload) {
        return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }
    if (payload.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Apenas administradores podem acessar configurações de férias' }, { status: 403 });
    }

    try {
        const configs = await getLeaveSectorConfigs();

        // Busca todas as configurações globais (app_secrets) com fallback
        const [hrEmailSecret, carlosGalloSecret, extraEmailsSecret, advanceDaysSecret] = await Promise.all([
            readSecret('HR_EMAIL'),
            readSecret(CARLOS_GALLO_EMAIL_KEY),
            readSecret(LEAVE_EXTRA_NOTIFY_EMAILS_KEY),
            readSecret(LEAVE_ADVANCE_NOTICE_DAYS_KEY)
        ]);

        const hrEmail = hrEmailSecret || process.env.HR_EMAIL || 'rh@groupabz.com';
        const carlosGalloEmail = carlosGalloSecret || process.env.CARLOS_GALLO_EMAIL || 'carlos.gallo@groupabz.com';
        const extraNotifyEmails = extraEmailsSecret || process.env.LEAVE_EXTRA_NOTIFY_EMAILS || '';

        let advanceNoticeDays = DEFAULT_LEAVE_ADVANCE_NOTICE_DAYS;
        if (advanceDaysSecret) {
            const parsed = parseInt(advanceDaysSecret, 10);
            if (!isNaN(parsed) && parsed > 0) {
                advanceNoticeDays = parsed;
            }
        } else if (process.env.LEAVE_ADVANCE_NOTICE_DAYS) {
            const parsed = Number(process.env.LEAVE_ADVANCE_NOTICE_DAYS);
            if (!isNaN(parsed) && parsed > 0) {
                advanceNoticeDays = parsed;
            }
        }

        // Fetch all sectors via Admin
        const { data: sectorsData, error: sError } = await supabaseAdmin
            .from('sectors')
            .select('id, name')
            .order('name');

        if (sError) throw sError;

        // Fetch all users for dropdowns via Admin
        const { data: usersData, error: uError } = await supabaseAdmin
            .from('users_unified')
            .select('id, name, email, sector_id, role, active')
            .eq('active', true)
            .order('name');

        if (uError) throw uError;

        return NextResponse.json({
            hrEmail,
            carlosGalloEmail,
            extraNotifyEmails,
            advanceNoticeDays,
            configs: configs || [],
            sectors: sectorsData || [],
            users: usersData || []
        });
    } catch (error) {
        console.error('Error in GET /api/admin/leave-settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const payload = getAuthPayload(request);
    if (!payload) {
        return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }
    if (payload.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Apenas administradores podem modificar configurações de férias' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const {
            sector_id,
            leader_id,
            manager_id,
            hrEmail,
            carlosGalloEmail,
            extraNotifyEmails,
            advanceNoticeDays
        } = body;

        // ===== Configurações globais (app_secrets) =====
        // Se veio qualquer campo global, salvamos todos os globais juntos
        // para manter consistência (single source of truth).
        const hasGlobalUpdate =
            hrEmail !== undefined ||
            carlosGalloEmail !== undefined ||
            extraNotifyEmails !== undefined ||
            advanceNoticeDays !== undefined;

        if (hasGlobalUpdate) {
            // Validações
            if (hrEmail !== undefined && hrEmail !== '' && !isValidEmail(hrEmail)) {
                return NextResponse.json({ error: 'E-mail do RH inválido' }, { status: 400 });
            }
            if (carlosGalloEmail !== undefined && carlosGalloEmail !== '' && !isValidEmail(carlosGalloEmail)) {
                return NextResponse.json({ error: 'E-mail do Carlos Gallo inválido' }, { status: 400 });
            }
            if (extraNotifyEmails !== undefined && extraNotifyEmails !== '') {
                const emails = extraNotifyEmails.split(',').map((e: string) => e.trim()).filter(Boolean);
                const invalid = emails.find((e: string) => !isValidEmail(e));
                if (invalid) {
                    return NextResponse.json({ error: `E-mail adicional inválido: ${invalid}` }, { status: 400 });
                }
            }
            if (advanceNoticeDays !== undefined) {
                const parsed = Number(advanceNoticeDays);
                if (isNaN(parsed) || parsed < 1 || parsed > 365) {
                    return NextResponse.json({
                        error: 'O prazo de antecedência deve ser um número entre 1 e 365 dias'
                    }, { status: 400 });
                }
            }

            // Persistência
            if (hrEmail !== undefined) {
                await upsertSecret('HR_EMAIL', hrEmail, 'Email do RH para notificações de férias');
            }
            if (carlosGalloEmail !== undefined) {
                await upsertSecret(
                    CARLOS_GALLO_EMAIL_KEY,
                    carlosGalloEmail,
                    'Email do Carlos Gallo (DP) para notificações de novas solicitações de férias'
                );
            }
            if (extraNotifyEmails !== undefined) {
                const normalized = normalizeEmailList(extraNotifyEmails);
                if (normalized) {
                    await upsertSecret(
                        LEAVE_EXTRA_NOTIFY_EMAILS_KEY,
                        normalized,
                        'Lista de emails adicionais (separados por vírgula) notificados em novas solicitações de férias'
                    );
                } else {
                    // Se veio vazio, remover a credencial (para não cair no fallback)
                    await supabaseAdmin
                        .from('app_secrets')
                        .delete()
                        .eq('key', LEAVE_EXTRA_NOTIFY_EMAILS_KEY);
                    clearCredentialCache(LEAVE_EXTRA_NOTIFY_EMAILS_KEY);
                }
            }
            if (advanceNoticeDays !== undefined) {
                await upsertSecret(
                    LEAVE_ADVANCE_NOTICE_DAYS_KEY,
                    String(Math.round(Number(advanceNoticeDays))),
                    'Prazo mínimo de antecedência (em dias) para solicitação de férias'
                );
            }

            return NextResponse.json({ success: true });
        }

        // ===== Hierarquia por setor =====
        if (!sector_id) {
            return NextResponse.json({ error: 'Sector ID is required' }, { status: 400 });
        }

        const success = await upsertLeaveSectorConfig(
            sector_id,
            leader_id || null,
            manager_id || null
        );

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
        }
    } catch (error) {
        console.error('Error in POST /api/admin/leave-settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
