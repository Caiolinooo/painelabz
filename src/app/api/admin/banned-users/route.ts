import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { getBannedUsers, unbanUser } from '@/lib/banned-users';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization') || '';
    const token = extractTokenFromHeader(authHeader);

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

    // Verificar se o usuário é administrador
    const { data: requestingUser, error: userError } = await supabaseAdmin
      .from('users_unified')
      .select('id, role, email, phone_number')
      .eq('id', payload.userId)
      .single();

    const adminEmail = ***REMOVED*** || '***REMOVED***';
    const adminPhone = ***REMOVED*** || '+5522997847289';
    const isMainAdmin = requestingUser?.email === adminEmail || requestingUser?.phone_number === adminPhone;

    if (userError || !requestingUser || (requestingUser.role !== 'ADMIN' && !isMainAdmin)) {
      return NextResponse.json(
        { error: 'Acesso negado - apenas administradores' },
        { status: 403 }
      );
    }

    // Buscar usuários banidos
    const result = await getBannedUsers();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao buscar usuários banidos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || []
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}


export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization') || '';
    const token = extractTokenFromHeader(authHeader);

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

    // Verificar se o usuário é administrador
    const { data: requestingUser, error: userError } = await supabaseAdmin
      .from('users_unified')
      .select('id, role, email, phone_number')
      .eq('id', payload.userId)
      .single();

    const adminEmail = ***REMOVED*** || '***REMOVED***';
    const adminPhone = ***REMOVED*** || '+5522997847289';
    const isMainAdmin = requestingUser?.email === adminEmail || requestingUser?.phone_number === adminPhone;

    if (userError || !requestingUser || (requestingUser.role !== 'ADMIN' && !isMainAdmin)) {
      return NextResponse.json(
        { error: 'Acesso negado - apenas administradores' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, cpf, firstName, lastName, reason } = body;

    if (!email && !cpf) {
      return NextResponse.json(
        { error: 'Email ou CPF é obrigatório para banimento manual' },
        { status: 400 }
      );
    }

    // Usar a função banUser do lib
    const { banUser } = await import('@/lib/banned-users');
    const result = await banUser(
      {
        id: 'manual-ban', // Placeholder id since user might not exist in users_unified yet
        email,
        cpf,
        first_name: firstName,
        last_name: lastName
      },
      requestingUser.id,
      reason || 'Banimento manual por administrador'
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao banir usuário' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário adicionado à lista de banidos com sucesso'
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization') || '';
    const token = extractTokenFromHeader(authHeader);

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

    // Verificar se o usuário é administrador
    const { data: requestingUser, error: userError } = await supabaseAdmin
      .from('users_unified')
      .select('id, role, email, phone_number')
      .eq('id', payload.userId)
      .single();

    const adminEmail = ***REMOVED*** || '***REMOVED***';
    const adminPhone = ***REMOVED*** || '+5522997847289';
    const isMainAdmin = requestingUser?.email === adminEmail || requestingUser?.phone_number === adminPhone;

    if (userError || !requestingUser || (requestingUser.role !== 'ADMIN' && !isMainAdmin)) {
      return NextResponse.json(
        { error: 'Acesso negado - apenas administradores' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, phoneNumber, cpf } = body;

    if (!email && !phoneNumber && !cpf) {
      return NextResponse.json(
        { error: 'Pelo menos um identificador (email, telefone ou CPF) é obrigatório' },
        { status: 400 }
      );
    }

    // Remover usuário da lista de banidos
    const result = await unbanUser(email, phoneNumber, cpf);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao desbanir usuário' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário removido da lista de banidos com sucesso'
    });

  } catch (error) {
    console.error('Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
