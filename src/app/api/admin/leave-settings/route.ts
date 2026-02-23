import { NextResponse } from 'next/server';
import { getLeaveSectorConfigs, upsertLeaveSectorConfig } from '@/services/leaveService';
import { supabaseAdmin } from '@/lib/db';

export async function GET() {
    try {
        const configs = await getLeaveSectorConfigs();

        // Fetch generic settings
        const { data: hrEmailSecret } = await supabaseAdmin
            .from('app_secrets')
            .select('value')
            .eq('key', 'HR_EMAIL')
            .single();

        const hrEmail = hrEmailSecret?.value || process.env.HR_EMAIL || 'rh@groupabz.com';

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
            hrEmail: hrEmail,
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
    try {
        const body = await request.json();
        const { sector_id, leader_id, manager_id, hrEmail } = body;

        // Se veio o hrEmail, é uma chamada para salvar configurações globais
        if (hrEmail !== undefined) {
            // Check if hrEmail key exists
            const { data: existing } = await supabaseAdmin
                .from('app_secrets')
                .select('id')
                .eq('key', 'HR_EMAIL')
                .single();

            let updateError = null;

            if (existing) {
                const { error } = await supabaseAdmin
                    .from('app_secrets')
                    .update({ value: hrEmail })
                    .eq('key', 'HR_EMAIL');
                updateError = error;
            } else {
                const { error } = await supabaseAdmin
                    .from('app_secrets')
                    .insert([{
                        key: 'HR_EMAIL',
                        value: hrEmail,
                        description: 'Email do RH para notificações de férias',
                        is_encrypted: false
                    }]);
                updateError = error;
            }

            if (updateError) throw updateError;
            return NextResponse.json({ success: true });
        }

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
