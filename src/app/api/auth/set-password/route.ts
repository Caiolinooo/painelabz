import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { inviteCode, password } = await request.json();

    if (!inviteCode || !password) {
      return NextResponse.json(
        { error: 'Código de convite e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a senha atende aos requisitos mínimos
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Buscar usuário pelo código de convite
    console.log('Buscando usuário com código de convite:', inviteCode);
    const user = await prisma.user.findFirst({
      where: {
        inviteCode,
        inviteAccepted: { not: true },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Código de convite inválido ou já utilizado' },
        { status: 400 }
      );
    }

    // Gerar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Atualizar usuário
    console.log('Atualizando usuário com ID:', user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        inviteAccepted: true,
        inviteAcceptedAt: new Date(),
        passwordLastChanged: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Senha definida com sucesso',
    });
  } catch (error) {
    console.error('Erro ao definir senha:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
