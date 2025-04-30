import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Obter histórico de acesso de um usuário
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

    // Verificar se o usuário é administrador
    const requestingUser = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar o histórico.' },
        { status: 403 }
      );
    }

    // Obter o ID do usuário da query
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar o histórico de acesso do usuário
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

    return NextResponse.json({
      userId: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      accessHistory: user.accessHistory || []
    });
  } catch (error) {
    console.error('Erro ao obter histórico de acesso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Registrar uma nova entrada no histórico de acesso
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

    // Obter dados do corpo da requisição
    const body = await request.json();
    const { userId, action, details } = body;

    // Validar os dados
    if (!userId || !action) {
      return NextResponse.json(
        { error: 'ID do usuário e ação são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o usuário é administrador
    const requestingUser = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem registrar histórico.' },
        { status: 403 }
      );
    }

    // Buscar o usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accessHistory: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Adicionar entrada ao histórico
    const historyEntry = {
      timestamp: new Date(),
      action,
      details: details || ''
    };

    // Obter o histórico atual
    const accessHistory = user.accessHistory || [];

    // Atualizar o usuário com o novo histórico
    await prisma.user.update({
      where: { id: userId },
      data: {
        accessHistory: [...accessHistory, historyEntry]
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Histórico de acesso registrado com sucesso',
      entry: historyEntry
    });
  } catch (error) {
    console.error('Erro ao registrar histórico de acesso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
