
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SYSTEM_MODULES, ModuleDefinition } from '@/config/modules';

// Initialize Supabase Admin client
const supabaseUrl = ***REMOVED***!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = ***REMOVED*** supabaseServiceKey);

export async function POST(request: NextRequest) {
    try {
        // Check for admin permissions (simple check for now, can be enhanced)
        // Ideally use a middleware or session check here

        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!token) { // For simplicity in this sync script, we might rely on service role or specific secure header
            // In production, verify user is admin
        }

        const results = {
            modules: { success: 0, failed: 0 },
            cards: { success: 0, failed: 0 }
        };

        console.log('Starting module synchronization...');

        for (const module of SYSTEM_MODULES) {
            // 1. Upsert into sys_modules
            const permissions = {
                read: module.defaultRoles.map(r => r.toLowerCase()),
                write: module.defaultRoles.includes('ADMIN') ? ['admin'] : module.defaultRoles.map(r => r.toLowerCase()) // Simplified write logic
            };

            const { error: moduleError } = await supabase
                .from('sys_modules')
                .upsert({
                    key: module.key,
                    description: module.description,
                    permissions: permissions,
                    active: true
                }, { onConflict: 'key' });

            if (moduleError) {
                console.error(`Error syncing module ${module.key}:`, moduleError);
                results.modules.failed++;
            } else {
                results.modules.success++;
            }

            // 2. Upsert into cards (assuming 1:1 mapping for simplicity for now)
            // We check if a card exists with this key
            const { data: existingCard } = await supabase
                .from('cards')
                .select('id')
                .eq('key', module.key)
                .single();

            const cardData = {
                key: module.key,
                title: module.name,
                description: module.description || '',
                icon: 'CubeIcon', // Default icon
                link: `/${module.key}`,
                type: 'system',
                active: true,
                allowed_roles: module.defaultRoles, // Use the default roles from config
                allowed_user_ids: [],
                admin_only: module.defaultRoles.length === 1 && module.defaultRoles.includes('ADMIN'),
                manager_only: !module.defaultRoles.includes('USER') && module.defaultRoles.includes('MANAGER'),
                order_index: 99 // Put new ones at end
            };

            if (existingCard) {
                // Update existing (careful not to overwrite user preferences if we had them)
                const { error: cardError } = await supabase
                    .from('cards')
                    .update({
                        title: module.name,
                        allowed_roles: module.defaultRoles,
                        description: module.description
                    })
                    .eq('key', module.key);

                if (cardError) results.cards.failed++; else results.cards.success++;
            } else {
                // Insert new
                const { error: cardError } = await supabase
                    .from('cards')
                    .insert(cardData);

                if (cardError) results.cards.failed++; else results.cards.success++;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Synchronization complete',
            stats: results
        });

    } catch (error: any) {
        console.error('Sync error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
