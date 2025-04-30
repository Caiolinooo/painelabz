import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// GET - Obter um usuário específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
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
      .select('id, role, first_name, last_name, email, phone_number')
      .eq('id', payload.userId)
      .single();

    if (userError || !requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem visualizar detalhes de usuários.' },
        { status: 403 }
      );
    }

    // Obter o ID do usuário dos parâmetros da rota
    const userId = params.id;

    // Buscar o usuário
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users_unified')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Mapear os campos para o formato esperado pelo cliente
    const mappedUser = {
      id: user.id,
      phoneNumber: user.phone_number,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      position: user.position,
      department: user.department,
      active: user.active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      accessHistory: user.access_history,
      accessPermissions: user.access_permissions
    };

    return NextResponse.json(mappedUser);
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar um usuário
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
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
      .select('id, role, first_name, last_name, email, phone_number, access_history')
      .eq('id', payload.userId)
      .single();

    if (userError || !requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem atualizar usuários.' },
        { status: 403 }
      );
    }

    // Obter o ID do usuário dos parâmetros da rota
    const userId = params.id;

    // Obter os dados do corpo da requisição
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      role,
      position,
      department,
      active,
      accessPermissions,
      password
    } = body;

    // Validar os dados
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'Nome e sobrenome são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar o usuário
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users_unified')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Preparar os dados para atualização
    const now = new Date().toISOString();
    const updateData: any = {
      first_name: firstName,
      last_name: lastName,
      email,
      role: ['ADMIN', 'USER', 'MANAGER'].includes(role) ? role : user.role,
      position,
      department,
      updated_at: now
    };

    if (active !== undefined) {
      updateData.active = active;
    }

    if (accessPermissions) {
      updateData.access_permissions = accessPermissions;
    }

    if (password) {
      // Gerar hash da senha
      updateData.password = await bcrypt.hash(password, 10);
      updateData.password_last_changed = now;
    }

    // Obter o histórico de acesso atual
    const accessHistory = user.access_history || [];

    // Adicionar novo registro ao histórico
    updateData.access_history = [
      ...accessHistory,
      {
        timestamp: now,
        action: 'UPDATED',
        details: `Usuário atualizado por ${requestingUser.first_name} ${requestingUser.last_name}`
      }
    ];

    // Atualizar o usuário
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users_unified')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar usuário:', updateError);
      return NextResponse.json(
        { error: `Erro ao atualizar usuário: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Registrar a ação no histórico do administrador
    const adminAccessHistory = requestingUser.access_history || [];
    const { error: adminUpdateError } = await supabaseAdmin
      .from('users_unified')
      .update({
        access_history: [
          ...adminAccessHistory,
          {
            timestamp: now,
            action: 'UPDATE_USER',
            details: `Atualizou o usuário ${user.first_name} ${user.last_name}`
          }
        ],
        updated_at: now
      })
      .eq('id', requestingUser.id);

    if (adminUpdateError) {
      console.error('Erro ao atualizar histórico do administrador:', adminUpdateError);
    }

    // Mapear os campos para o formato esperado pelo cliente
    const userResponse = {
      id: updatedUser.id,
      phoneNumber: updatedUser.phone_number,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      role: updatedUser.role,
      position: updatedUser.position,
      department: updatedUser.department,
      active: updatedUser.active,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
      accessHistory: updatedUser.access_history,
      accessPermissions: updatedUser.access_permissions
    };

    return NextResponse.json(userResponse);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir um usuário
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
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
      .select('id, role, first_name, last_name, email, phone_number, access_history')
      .eq('id', payload.userId)
      .single();

    if (userError || !requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem excluir usuários.' },
        { status: 403 }
      );
    }

    // Obter o ID do usuário dos parâmetros da rota
    const userId = params.id;

    // Não permitir excluir o próprio usuário
    if (userId === payload.userId) {
      return NextResponse.json(
        { error: 'Não é possível excluir o próprio usuário' },
        { status: 400 }
      );
    }

    // Buscar o usuário
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users_unified')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Armazenar informações do usuário para o log
    const userInfo = `${user.first_name} ${user.last_name} (${user.phone_number})`;

    // Excluir o usuário
    const { error: deleteError } = await supabaseAdmin
      .from('users_unified')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Erro ao excluir usuário:', deleteError);
      return NextResponse.json(
        { error: `Erro ao excluir usuário: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Registrar a ação no histórico do administrador
    const now = new Date().toISOString();
    const adminAccessHistory = requestingUser.access_history || [];
    const { error: adminUpdateError } = await supabaseAdmin
      .from('users_unified')
      .update({
        access_history: [
          ...adminAccessHistory,
          {
            timestamp: now,
            action: 'DELETE_USER',
            details: `Excluiu o usuário ${userInfo}`
          }
        ],
        updated_at: now
      })
      .eq('id', requestingUser.id);

    if (adminUpdateError) {
      console.error('Erro ao atualizar histórico do administrador:', adminUpdateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
