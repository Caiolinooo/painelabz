import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return false;

    try {
        const { data } = await supabaseAdmin
            .from('users_unified')
            .select('role')
            .eq('id', (await import('@/lib/auth').then(m => m.verifyToken(token as string)))?.userId)
            .single();
        return data?.role === 'ADMIN';
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    try {
        const { data: sectors } = await supabaseAdmin
            .from('sectors')
            .select('id, name, allowed_modules')
            .order('name', { ascending: true });

        const { data: users } = await supabaseAdmin
            .from('users_unified')
            .select('id, name, email, role, sector_id, access_permissions, sector:sectors(name)')
            .eq('active', true)
            .order('name', { ascending: true });

        const sectorAccessMap = new Map<string, boolean>();
        (sectors || []).forEach((s: any) => {
            const modules = s.allowed_modules || [];
            sectorAccessMap.set(s.id, modules.includes('ferias_admin'));
        });

        const usersWithAccess = (users || []).map((u: any) => {
            const sectorHasAccess = u.sector_id ? (sectorAccessMap.get(u.sector_id) ?? false) : false;
            const userPerms = u.access_permissions as { modules?: Record<string, boolean> } | null;
            const userOverride = userPerms?.modules?.ferias_admin;
            const hasAccess = userOverride !== undefined ? userOverride : sectorHasAccess;

            return {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                sector_id: u.sector_id,
                sector_name: u.sector?.name || null,
                sector_has_access: sectorHasAccess,
                user_override: userOverride,
                has_access: hasAccess,
                source: userOverride !== undefined ? 'user_override' : 'sector'
            };
        });

        return NextResponse.json({
            sectors: (sectors || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                has_access: sectorAccessMap.get(s.id) ?? false
            })),
            users: usersWithAccess
        });
    } catch (error: any) {
        console.error('Error fetching ferias admin access:', error);
        return NextResponse.json({ error: 'Failed to fetch access configuration' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, targetId, enabled } = body;

        if (!type || !targetId || (type === 'user' && enabled === undefined) || (type !== 'user' && typeof enabled !== 'boolean')) {
            return NextResponse.json(
                { error: 'type, targetId, and enabled are required' },
                { status: 400 }
            );
        }

        if (type === 'sector') {
            const { data: sector } = await supabaseAdmin
                .from('sectors')
                .select('allowed_modules')
                .eq('id', targetId)
                .single();

            if (!sector) {
                return NextResponse.json({ error: 'Sector not found' }, { status: 404 });
            }

            let modules: string[] = sector.allowed_modules || [];
            if (enabled) {
                if (!modules.includes('ferias_admin')) {
                    modules.push('ferias_admin');
                }
            } else {
                modules = modules.filter((m: string) => m !== 'ferias_admin');
            }

            const { error } = await supabaseAdmin
                .from('sectors')
                .update({ allowed_modules: modules })
                .eq('id', targetId);

            if (error) {
                console.error('Error updating sector modules:', error);
                return NextResponse.json({ error: 'Failed to update sector' }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: `Sector ${enabled ? 'granted' : 'revoked'} access` });
        }

        if (type === 'user') {
            const { data: user } = await supabaseAdmin
                .from('users_unified')
                .select('access_permissions')
                .eq('id', targetId)
                .single();

            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            const perms = (user.access_permissions as { modules?: Record<string, boolean> } | null) || {};
            const modules = perms.modules || {};

            if (enabled === null) {
                delete modules.ferias_admin;
            } else {
                modules.ferias_admin = enabled;
            }

            const { error } = await supabaseAdmin
                .from('users_unified')
                .update({ access_permissions: { ...perms, modules } })
                .eq('id', targetId);

            if (error) {
                console.error('Error updating user permissions:', error);
                return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: enabled === null ? 'User override removed' : `User ${enabled ? 'granted' : 'revoked'} access` });
        }

        return NextResponse.json({ error: 'Invalid type. Use "sector" or "user"' }, { status: 400 });
    } catch (error: any) {
        console.error('Error updating ferias admin access:', error);
        return NextResponse.json({ error: 'Failed to update access configuration' }, { status: 500 });
    }
}
