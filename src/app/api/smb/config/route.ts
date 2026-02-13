/**
 * API Route: SMB Config
 * GET - Retorna configurações SMB (sem password)
 * PUT - Salva/atualiza configuração
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdmin } from '@/lib/api-auth';
import { encryptPassword } from '@/lib/smbService';

export const dynamic = 'force-dynamic';

// GET - Listar conexões SMB
export const GET = withAdmin(async (request: NextRequest) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('smb_connections')
            .select('id, name, host, share, domain, username, base_path, port, local_path, is_active, sync_target_category, last_sync_at, last_sync_status, last_sync_files_count, last_sync_error, created_at, updated_at')
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// PUT - Criar ou atualizar conexão SMB
export const PUT = withAdmin(async (request: NextRequest) => {
    try {
        const body = await request.json();
        const { id, name, host, share, domain, username, password, base_path, port, local_path, is_active, sync_target_category } = body;

        // Validation depends on mode
        if (local_path) {
            if (!name) {
                return NextResponse.json(
                    { error: 'Nome é obrigatório para conexão local' },
                    { status: 400 }
                );
            }
        } else {
            if (!name || !host || !share || !username) {
                return NextResponse.json(
                    { error: 'Campos obrigatórios: name, host, share, username' },
                    { status: 400 }
                );
            }
        }

        const record: any = {
            name,
            host: host || '',
            share: share || '',
            domain: domain || '',
            username: username || '',
            base_path: base_path || '',
            port: port || 445,
            local_path: local_path || '',
            is_active: is_active !== false,
            sync_target_category: sync_target_category || 'Políticas Internas',
            updated_at: new Date().toISOString(),
        };

        // Only encrypt and update password if provided
        if (password) {
            record.password_encrypted = encryptPassword(password);
        }

        let result;

        if (id) {
            // Update existing
            const { data, error } = await supabaseAdmin
                .from('smb_connections')
                .update(record)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            result = data;
        } else {
            // Create new
            // Password required only for SMB mode
            if (!local_path && !password) {
                return NextResponse.json(
                    { error: 'Password é obrigatório para nova conexão SMB' },
                    { status: 400 }
                );
            }

            // If local mode, ensure password_encrypted is not null (use empty or placeholder)
            if (local_path && !password) {
                record.password_encrypted = encryptPassword('local-mode-no-password');
            }

            const { data, error } = await supabaseAdmin
                .from('smb_connections')
                .insert(record)
                .select()
                .single();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            result = data;
        }

        // Remove password_encrypted from response
        if (result) {
            delete result.password_encrypted;
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// DELETE - Remover conexão SMB
export const DELETE = withAdmin(async (request: NextRequest) => {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('smb_connections')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
