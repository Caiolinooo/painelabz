/**
 * API Route: SMB Test Connection
 * POST - Testa conexão SMB ou caminho local com credenciais fornecidas
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdmin } from '@/lib/api-auth';
import { SmbService, LocalFsService, createServiceFromConfig } from '@/lib/smbService';

export const dynamic = 'force-dynamic';

export const POST = withAdmin(async (request: NextRequest) => {
    let service: SmbService | LocalFsService | null = null;

    try {
        const body = await request.json();
        const { connection_id, host, share, domain, username, password, port, local_path } = body;

        // If connection_id is provided, load from database
        if (connection_id) {
            const { data: conn, error } = await supabaseAdmin
                .from('smb_connections')
                .select('*')
                .eq('id', connection_id)
                .single();

            if (error || !conn) {
                return NextResponse.json(
                    { success: false, message: 'Conexão não encontrada' },
                    { status: 404 }
                );
            }

            service = createServiceFromConfig(conn);
        } else if (local_path) {
            // Local path mode
            service = new LocalFsService(local_path);
        } else {
            // SMB mode - use provided credentials
            if (!host || !share || !username || !password) {
                return NextResponse.json(
                    { success: false, message: 'Campos obrigatórios: host, share, username, password' },
                    { status: 400 }
                );
            }

            service = new SmbService({
                host,
                share,
                domain: domain || '',
                username,
                password,
                port: port || 445,
            });
        }

        const result = await service.testConnection();

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: `Erro: ${error.message}` },
            { status: 500 }
        );
    } finally {
        service?.disconnect();
    }
});
