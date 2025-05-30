import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePasswordResetToken, sendPasswordResetEmail, sendPasswordResetSMS } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phoneNumber } = body;

    // Validar os dados de entrada
    if (!email && !phoneNumber) {
      return NextResponse.json(
        { error: 'Email ou número de telefone é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar o usuário pelo email ou número de telefone
    const where = email ? { email } : { phoneNumber };
    const user = await prisma.user.findFirst({ where });

    // Se o usuário não for encontrado, retornar sucesso para evitar enumeração de usuários
    // Isso é uma prática de segurança para não revelar quais emails/telefones estão cadastrados
    if (!user) {
      console.log('Usuário não encontrado para recuperação de senha:', query);
      return NextResponse.json({
        success: true,
        message: 'Se o email/telefone estiver cadastrado, você receberá instruções para redefinir sua senha.'
      });
    }

    // Verificar se o usuário está ativo
    if (!user.active) {
      console.log('Usuário inativo tentando recuperar senha:', user.phoneNumber);
      return NextResponse.json({
        success: true,
        message: 'Se o email/telefone estiver cadastrado, você receberá instruções para redefinir sua senha.'
      });
    }

    // Gerar token de redefinição de senha
    const { token, expiresAt } = generatePasswordResetToken();

    // Atualizar o usuário com o token de redefinição
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expiresAt
      }
    });

    // Enviar email ou SMS com o link de redefinição
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`;

    let sendResult;
    if (email) {
      sendResult = await sendPasswordResetEmail(email, resetUrl);
    } else {
      sendResult = await sendPasswordResetSMS(phoneNumber, resetUrl);
    }

    if (!sendResult.success) {
      console.error('Erro ao enviar instruções de redefinição:', sendResult.message);
      return NextResponse.json(
        { error: 'Erro ao enviar instruções de redefinição. Por favor, tente novamente.' },
        { status: 500 }
      );
    }

    // Registrar no histórico de acesso
    const accessHistory = user.accessHistory || [];
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accessHistory: [
          ...accessHistory,
          {
            timestamp: new Date(),
            action: 'PASSWORD_RESET_REQUEST',
            details: `Solicitação de redefinição de senha via ${email ? 'email' : 'SMS'}`
          }
        ]
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Instruções de redefinição de senha enviadas com sucesso.'
    });
  } catch (error) {
    console.error('Erro ao processar solicitação de recuperação de senha:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
