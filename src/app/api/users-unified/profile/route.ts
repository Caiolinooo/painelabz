import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader || '');

    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Obter dados do corpo da requisição
    const body = await request.json();
    const { first_name, last_name, position, department } = body;

    // Validar dados
    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: 'Nome e sobrenome são obrigatórios' },
        { status: 400 }
      );
    }

    // Inicializar cliente Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Atualizar perfil do usuário
    const { error } = await supabase
      .from('users_unified')
      .update({
        first_name,
        last_name,
        position,
        department,
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.userId);

    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar perfil' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
