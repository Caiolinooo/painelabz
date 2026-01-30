import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Default permissions by role
const rolePermissions: Record<string, { modules: Record<string, boolean> }> = {
    ADMIN: {
        modules: {
            dashboard: true,
            manual: true,
            procedimentos: true,
            politicas: true,
            calendario: true,
            noticias: true,
            reembolso: true,
            contracheque: true,
            ponto: true,
            admin: true,
            'compras': true,
            'chat': true,
            'wkradar': true,
            'guia_offshore': true
        }
    },
    MANAGER: {
        modules: {
            dashboard: true,
            manual: true,
            procedimentos: true,
            politicas: true,
            calendario: true,
            noticias: true,
            reembolso: true,
            contracheque: true,
            ponto: true,
            admin: false,
            'compras': true,
            'chat': true,
            'wkradar': true,
            'guia_offshore': true
        }
    },
    USER: {
        modules: {
            dashboard: true,
            manual: true,
            procedimentos: true,
            politicas: true,
            calendario: true,
            noticias: true,
            reembolso: true,
            contracheque: true,
            ponto: true,
            admin: false,
            'compras': true
        }
    }
};

/**
 * GET /api/user/effective-permissions
 * 
 * Calculates the effective permissions for the current user based on:
 * 1. Sector defaults (base layer)
 * 2. Role defaults (override layer 1 - ADMIN/MANAGER override sector)
 * 3. User individual permissions (override layer 2 - final override)
 */
export async function GET(request: NextRequest) {
    try {
        // Get token from header or cookie
        const authHeader = request.headers.get('authorization');
        let token = extractTokenFromHeader(authHeader || undefined);

        if (!token) {
            const tokenCookie = request.cookies.get('abzToken') || request.cookies.get('token');
            if (tokenCookie) {
                token = tokenCookie.value;
            }
        }

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
        }

        const userId = payload.userId;

        // Fetch user profile with sector info
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('users_unified')
            .select('id, role, sector_id, access_permissions')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        // Layer 1: Sector Defaults
        let effectiveModules: Record<string, boolean> = {};
        let effectiveCards: string[] = [];

        if (profile.sector_id) {
            const { data: sector } = await supabaseAdmin
                .from('sectors')
                .select('allowed_modules, allowed_cards')
                .eq('id', profile.sector_id)
                .single();

            if (sector) {
                // Convert sector's allowed_modules array to a map
                (sector.allowed_modules || []).forEach((mod: string) => {
                    effectiveModules[mod] = true;
                });
                effectiveCards = sector.allowed_cards || [];
            }
        }

        // Layer 2 & 3: Role Override & Strict Sector Mode
        const userRole = (profile.role || 'USER').toUpperCase();
        const roleDefaults = rolePermissions[userRole] || rolePermissions.USER;

        // Core modules that are ALWAYS enabled for everyone regardless of sector
        const coreModules = ['dashboard', 'noticias', 'calendario', 'ajuda'];

        // Legacy/Label mapping to ID (Normalization)
        // This handles cases where DB has 'KPIs' (label) instead of 'kpi' (id)
        const normalizeModuleId = (idOrLabel: string): string => {
            const lower = idOrLabel.toLowerCase().trim();
            const map: Record<string, string> = {
                'purchase-orders': 'compras',
                'purchase orders': 'compras',
                'ordens de compra': 'compras',
                'kpis': 'kpi',
                'wk radar': 'wkradar',
                'radar': 'wkradar',
                'lista de ramais': 'contatos',
                'ramais': 'contatos',
                'emergência': 'emergencia',
                'emergencia': 'emergencia',
                'guia offshore': 'guia_offshore',
                'integração erp': 'integracao-erp',
                'integracao erp': 'integracao-erp'
            };
            return map[lower] || lower; // default to lowercase if not mapped
        };

        // ADMIN and MANAGER roles ALWAYS get their defined modules, overriding sector
        if (userRole === 'ADMIN' || userRole === 'MANAGER') {
            effectiveModules = { ...effectiveModules, ...roleDefaults.modules };
        } else {
            // USER Role Logic
            if (profile.sector_id) {
                // STRICT SECTOR MODE:
                // If user has a sector, they ONLY get:
                // 1. Modules explicitly allowed by the sector (already in effectiveModules)
                // 2. Core modules (dashboard, noticias, etc.)
                // 3. Modules explicitly granted to the user individually (Layer 3)

                // We do NOT merge sensitive role defaults (like 'compras', 'ponto') 
                // preventing them from leaking into restricted sectors.

                // Normalize keys in effectiveModules from Sector
                // We built effectiveModules from sector.allowed_modules initially. 
                // We need to ensure those keys are normalized.
                const normalizedModules: Record<string, boolean> = {};
                Object.keys(effectiveModules).forEach(key => {
                    if (effectiveModules[key]) {
                        normalizedModules[normalizeModuleId(key)] = true;
                    }
                });
                effectiveModules = normalizedModules;

                // Ensure core modules are enabled
                coreModules.forEach(mod => {
                    if (effectiveModules[mod] === undefined && roleDefaults.modules[mod]) {
                        effectiveModules[mod] = true;
                    }
                });
            } else {
                // NO SECTOR:
                // Fallback to role defaults for users without a sector (legacy behavior)
                // For USER role, merge default permissions
                for (const [mod, enabled] of Object.entries(roleDefaults.modules)) {
                    if (effectiveModules[mod] === undefined) {
                        effectiveModules[mod] = enabled;
                    }
                }
            }
        }

        // Layer 3: User Individual Override (highest priority)
        const userPermissions = profile.access_permissions as { modules?: Record<string, boolean> } | null;
        if (userPermissions?.modules) {
            effectiveModules = { ...effectiveModules, ...userPermissions.modules };
        }

        // Build final response
        return NextResponse.json({
            user_id: userId,
            role: profile.role,
            sector_id: profile.sector_id,
            effective_modules: effectiveModules,
            effective_cards: effectiveCards,
            // Source info for debugging
            _debug: {
                source: {
                    sector: profile.sector_id ? 'applied' : 'none',
                    role: userRole,
                    user_override: userPermissions ? 'applied' : 'none'
                },
                role_defaults_applied: rolePermissions[userRole] ? Object.keys(rolePermissions[userRole].modules) : [],
                sector_modules_count: Object.keys(effectiveModules).length
            }
        });

    } catch (error: any) {
        console.error('Error calculating effective permissions:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
