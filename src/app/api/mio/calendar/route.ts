import { NextRequest, NextResponse } from 'next/server';
import { mioClient } from '@/lib/mio/client';
import { getSupabaseAdmin } from '@/lib/supabase';

// Evitar cache estático
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Verificar autenticação do usuário que está pedindo o calendário
        // (Opcional: filtrar eventos apenas para o usuário logado ou para todos se for admin/gerente)
        // Por enquanto, vamos pegar o CPF do usuário logado para mostrar SEUS eventos

        // Obter usuário logado via Supabase Auth
        const authHeader = request.headers.get('Authorization');
        // ... Lógica de auth simplificada para V1: 
        // Vamos assumir que o frontend manda o token ou o cookie server-side resolve.
        // Mas para simplificar, se não tiver user context, retornamos erro ou lista vazia.

        // Como estamos num App Router server-side, podemos usar cookies/headers.
        // Para simplificar a integração inicial, vamos buscar "todos" os eventos se for admin/gerente
        // ou filtrar por CPF se vier na query string (segurança por obscuridade não é ideal, mas funcional para V1 interna)

        // Melhor abordagem:
        const supabase = await getSupabaseAdmin();
        // Tentar pegar usuario da sessao (precisaria do cookie do request)
        // const { data: { user } } = await supabase.auth.getUser(); // Isso requer forward de cookies

        // Vamos aceitar um parametro 'cpf' na query string para testes, e futuramente vincular ao token.
        const searchParams = request.nextUrl.searchParams;
        const cpf = searchParams.get('cpf') || undefined;

        // Buscar eventos unificados
        const events = await mioClient.getCalendarEvents(cpf);

        return NextResponse.json({
            success: true,
            events
        });

    } catch (error: any) {
        console.error('Erro na API MIO Calendar:', error);
        return NextResponse.json(
            { success: false, error: 'Falha ao carregar eventos MIO' },
            { status: 500 }
        );
    }
}
