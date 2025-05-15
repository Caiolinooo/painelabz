import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validar os dados de entrada
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Buscar o usuário pelo token de redefinição
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 400 }
      );
    }

    // Verificar se o usuário está ativo
    if (!user.active) {
      return NextResponse.json(
        { error: 'Conta de usuário desativada' },
        { status: 403 }
      );
    }

    // Gerar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Obter o histórico de acesso atual
    const accessHistory = user.accessHistory || [];

    // Adicionar novo registro ao histórico
    const updatedAccessHistory = [
      ...accessHistory,
      {
        timestamp: new Date(),
        action: 'PASSWORD_RESET',
        details: 'Senha redefinida via link de recuperação'
      }
    ];

    // Atualizar o usuário
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordLastChanged: new Date(),
        resetPasswordToken: null,
        resetPasswordExpires: null,
        accessHistory: updatedAccessHistory
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
