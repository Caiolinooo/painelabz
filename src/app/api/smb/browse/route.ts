/**
 * API Route: SMB Browse
 * GET - Lista arquivos e pastas de um share SMB
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withAdmin } from '@/lib/api-auth';
import { createServiceFromConfig, SmbService, LocalFsService } from '@/lib/smbService';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async (request: NextRequest) => {
    let service: SmbService | LocalFsService | null = null;

    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connection_id');
        const path = searchParams.get('path') || '';

        if (!connectionId) {
            return NextResponse.json(
                { error: 'connection_id é obrigatório' },
                { status: 400 }
            );
        }

        // Load connection from database
        const { data: conn, error } = await supabaseAdmin
            .from('smb_connections')
            .select('*')
            .eq('id', connectionId)
            .single();

        if (error || !conn) {
            return NextResponse.json(
                { error: 'Conexão não encontrada' },
                { status: 404 }
            );
        }

        service = createServiceFromConfig(conn);

        // Combine base_path with requested path
        const fullPath = conn.base_path
            ? path
                ? `${conn.base_path}/${path}`
                : conn.base_path
            : path;

        const files = await service.listFiles(fullPath);

        // Sort: directories first, then files alphabetically
        files.sort((a: any, b: any) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        return NextResponse.json({
            path: path || '/',
            basePath: conn.base_path,
            files,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    } finally {
        service?.disconnect();
    }
});
