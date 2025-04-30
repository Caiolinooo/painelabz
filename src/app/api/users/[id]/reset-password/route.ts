import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(
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
        { error: 'Acesso negado. Apenas administradores podem redefinir senhas.' },
        { status: 403 }
      );
    }

    // Obter o ID do usuário dos parâmetros da rota
    const userId = params.id;

    // Obter a nova senha do corpo da requisição
    const body = await request.json();
    const { password } = body;

    // Validar os dados
    if (!userId || !password) {
      return NextResponse.json(
        { error: 'ID do usuário e nova senha são obrigatórios' },
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

    // Gerar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Obter o histórico de acesso atual do usuário
    const userAccessHistory = user.accessHistory || [];

    // Atualizar a senha e registrar no histórico
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordLastChanged: new Date(),
        accessHistory: [
          ...userAccessHistory,
          {
            timestamp: new Date(),
            action: 'PASSWORD_RESET',
            details: `Senha redefinida por ${requestingUser.firstName} ${requestingUser.lastName}`
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
            action: 'RESET_USER_PASSWORD',
            details: `Redefiniu a senha do usuário ${user.firstName} ${user.lastName}`
          }
        ]
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
