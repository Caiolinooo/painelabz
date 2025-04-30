import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Obter permissões de acesso de um usuário
export async function GET(request: NextRequest) {
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

    // Obter o ID do usuário da query
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Se não for fornecido um ID, retornar as permissões do usuário atual
    if (!userId) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          role: true,
          accessPermissions: true
        }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        userId: user.id,
        role: user.role,
        accessPermissions: user.accessPermissions || {}
      });
    }

    // Se for fornecido um ID, verificar se o usuário atual é administrador
    const requestingUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        role: true
      }
    });

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem ver permissões de outros usuários.' },
        { status: 403 }
      );
    }

    // Buscar o usuário solicitado
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        accessPermissions: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role,
      accessPermissions: user.accessPermissions || {}
    });
  } catch (error) {
    console.error('Erro ao obter permissões de acesso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Atualizar permissões de acesso de um usuário
export async function POST(request: NextRequest) {
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
    const requestingUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        accessHistory: true
      }
    });

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem atualizar permissões.' },
        { status: 403 }
      );
    }

    // Obter dados do corpo da requisição
    const body = await request.json();
    const { userId, accessPermissions } = body;

    // Validar os dados
    if (!userId || !accessPermissions) {
      return NextResponse.json(
        { error: 'ID do usuário e permissões de acesso são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar o usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        accessHistory: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Obter o histórico de acesso atual do usuário
    const userAccessHistory = user.accessHistory || [];

    // Atualizar permissões de acesso e registrar no histórico
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        accessPermissions,
        accessHistory: [
          ...userAccessHistory,
          {
            timestamp: new Date(),
            action: 'PERMISSIONS_UPDATED',
            details: `Permissões atualizadas por ${requestingUser.firstName} ${requestingUser.lastName}`
          }
        ]
      }
    });

    // Registrar a ação no histórico do administrador
    const adminAccessHistory = requestingUser.accessHistory || [];
    await prisma.user.update({
      where: { id: requestingUser.id },
      data: {
        accessHistory: [
          ...adminAccessHistory,
          {
            timestamp: new Date(),
            action: 'UPDATE_PERMISSIONS',
            details: `Atualizou permissões do usuário ${user.firstName} ${user.lastName}`
          }
        ]
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Permissões de acesso atualizadas com sucesso',
      userId: updatedUser.id,
      accessPermissions: updatedUser.accessPermissions
    });
  } catch (error) {
    console.error('Erro ao atualizar permissões de acesso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
