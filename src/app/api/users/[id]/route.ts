import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

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
    await dbConnect();
    const requestingUser = await User.findById(payload.userId);

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem visualizar detalhes de usuários.' },
        { status: 403 }
      );
    }

    // Obter o ID do usuário dos parâmetros da rota
    const userId = params.id;

    // Buscar o usuário
    const user = await User.findById(userId).select('-password -verificationCode -verificationCodeExpires');

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
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
    await dbConnect();
    const requestingUser = await User.findById(payload.userId);

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
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
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar os dados do usuário
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    user.role = ['ADMIN', 'USER', 'MANAGER'].includes(role) ? role : user.role;
    user.position = position;
    user.department = department;

    if (active !== undefined) {
      user.active = active;
    }

    if (accessPermissions) {
      user.accessPermissions = accessPermissions;
    }

    if (password) {
      user.password = password;
    }

    // Registrar no histórico de acesso
    user.accessHistory.push({
      timestamp: new Date(),
      action: 'UPDATED',
      details: `Usuário atualizado por ${requestingUser.firstName} ${requestingUser.lastName}`
    });

    await user.save();

    // Registrar a ação no histórico do administrador
    requestingUser.accessHistory.push({
      timestamp: new Date(),
      action: 'UPDATE_USER',
      details: `Atualizou o usuário ${user.firstName} ${user.lastName}`
    });
    await requestingUser.save();

    // Retornar os dados do usuário (sem campos sensíveis)
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.verificationCode;
    delete userResponse.verificationCodeExpires;

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
    await dbConnect();
    const requestingUser = await User.findById(payload.userId);

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
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
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Armazenar informações do usuário para o log
    const userInfo = `${user.firstName} ${user.lastName} (${user.phoneNumber})`;

    // Excluir o usuário
    await User.findByIdAndDelete(userId);

    // Registrar a ação no histórico do administrador
    requestingUser.accessHistory.push({
      timestamp: new Date(),
      action: 'DELETE_USER',
      details: `Excluiu o usuário ${userInfo}`
    });
    await requestingUser.save();

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
