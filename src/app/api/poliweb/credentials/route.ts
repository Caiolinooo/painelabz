import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/poliweb/credentials
 * Retorna as credenciais Poliweb do usuário
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

        const url = new URL(request.url);
        const userId = url.searchParams.get('userId') || authResult.userId;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'ID do usuário não fornecido' },
                { status: 400 }
            );
        }

        const client = await supabaseAdmin;
        const { data: credentials, error } = await client
            .from('poliweb_credentials')
            .select('username, password, username_antigo, password_antigo')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Erro ao buscar credenciais Poliweb:', error);
            return NextResponse.json(
                { success: false, error: 'Erro ao buscar credenciais' },
                { status: 500 }
            );
        }

        if (credentials) {
            return NextResponse.json({
                success: true,
                credentials: {
                    username: credentials.username,
                    password: credentials.password,
                    username_antigo: credentials.username_antigo,
                    password_antigo: credentials.password_antigo,
                    useSameCredentials: !credentials.username_antigo && !credentials.password_antigo
                }
            });
        }

        return NextResponse.json({
            success: true,
            credentials: null
        });

    } catch (error) {
        console.error('Erro na API de credenciais Poliweb:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/poliweb/credentials
 * Cria ou atualiza credenciais Poliweb de um usuário (apenas admin)
 */
export async function POST(request: NextRequest) {
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
                { success: false, error: 'Acesso negado. Apenas administradores podem modificar credenciais.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { userId, username, password, username_antigo, password_antigo, useSameCredentials } = body;

        if (!userId || !username || !password) {
            return NextResponse.json(
                { success: false, error: 'userId, username e password são obrigatórios' },
                { status: 400 }
            );
        }

        const client = await supabaseAdmin;
        
        // If useSameCredentials is true, use novo credentials for antigo as well
        const antigoUsername = useSameCredentials ? username : (username_antigo || username);
        const antigoPassword = useSameCredentials ? password : (password_antigo || password);

        const { data, error } = await client
            .from('poliweb_credentials')
            .upsert(
                {
                    user_id: userId,
                    username: username,
                    password: password,
                    username_antigo: useSameCredentials ? username : (username_antigo || null),
                    password_antigo: useSameCredentials ? password : (password_antigo || null),
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'user_id'
                }
            )
            .select()
            .single();

        if (error) {
            console.error('Erro ao salvar credenciais Poliweb:', error);
            return NextResponse.json(
                { success: false, error: 'Erro ao salvar credenciais' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Credenciais salvas com sucesso',
            credentials: {
                userId: data.user_id,
                username: data.username
            }
        });

    } catch (error) {
        console.error('Erro na API de credenciais Poliweb:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/poliweb/credentials
 * Remove credenciais customizadas de um usuário (volta ao padrão)
 */
export async function DELETE(request: NextRequest) {
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
                { success: false, error: 'Acesso negado. Apenas administradores podem remover credenciais.' },
                { status: 403 }
            );
        }

        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'userId é obrigatório' },
                { status: 400 }
            );
        }

        const client = await supabaseAdmin;
        const { error } = await client
            .from('poliweb_credentials')
            .delete()
            .eq('user_id', userId);

        if (error) {
            console.error('Erro ao remover credenciais Poliweb:', error);
            return NextResponse.json(
                { success: false, error: 'Erro ao remover credenciais' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Credenciais removidas. O usuário usará as credenciais padrão.'
        });

    } catch (error) {
        console.error('Erro na API de credenciais Poliweb:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
