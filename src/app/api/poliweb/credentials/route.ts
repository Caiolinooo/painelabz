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
            .select('username, username_novo, password, password_novo, username_antigo, password_antigo')
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
                    username_novo: credentials.username_novo || credentials.username,
                    password_novo: credentials.password_novo || credentials.password,
                    username_antigo: credentials.username_antigo || credentials.username,
                    password_antigo: credentials.password_antigo || credentials.password
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
        const { userId, username_novo, password_novo, username_antigo, password_antigo, username, password } = body;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'userId é obrigatório' },
                { status: 400 }
            );
        }

        const client = await supabaseAdmin;
        
        const updateData: Record<string, unknown> = {
            user_id: userId,
            updated_at: new Date().toISOString()
        };

        if (username_novo && username_novo.trim()) updateData.username_novo = username_novo.trim();
        if (password_novo && password_novo.trim()) updateData.password_novo = password_novo.trim();
        if (username_antigo && username_antigo.trim()) updateData.username_antigo = username_antigo.trim();
        if (password_antigo && password_antigo.trim()) updateData.password_antigo = password_antigo.trim();
        
        if (username_novo && username_novo.trim()) updateData.username = username_novo.trim();
        else if (username_antigo && username_antigo.trim()) updateData.username = username_antigo.trim();
        else if (username && username.trim()) updateData.username = username.trim();
        
        if (password_novo && password_novo.trim()) updateData.password = password_novo.trim();
        else if (password_antigo && password_antigo.trim()) updateData.password = password_antigo.trim();
        else if (password && password.trim()) updateData.password = password.trim();

        const { data, error } = await client
            .from('poliweb_credentials')
            .upsert(
                updateData,
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
                username_novo: data.username_novo,
                username_antigo: data.username_antigo
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
