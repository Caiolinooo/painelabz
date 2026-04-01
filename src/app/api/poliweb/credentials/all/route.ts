import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/poliweb/credentials/all
 * Lista todas as credenciais Poliweb (apenas admin)
 */
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const token = extractTokenFromHeader(authHeader || undefined);

        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token não fornecido' },
                { status: 401 }
            );
        }

        const authResult = verifyToken(token);
        if (!authResult) {
            return NextResponse.json(
                { success: false, error: 'Token inválido' },
                { status: 401 }
            );
        }

        if (authResult.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Acesso negado. Apenas administradores podem ver todas as credenciais.' },
                { status: 403 }
            );
        }

        const client = await supabaseAdmin;
        const { data: credentials, error } = await client
            .from('poliweb_credentials')
            .select('id, user_id, username, password, created_at, updated_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao listar credenciais Poliweb:', error);
            return NextResponse.json(
                { success: false, error: 'Erro ao listar credenciais' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            credentials: credentials || []
        });

    } catch (error) {
        console.error('Erro na API de listagem de credenciais Poliweb:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
