import { NextRequest, NextResponse } from 'next/server';
import { initiatePhoneLogin, verifyPhoneLogin, loginWithPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, verificationCode, password, email, inviteCode } = body;

    console.log('Recebida solicitação de login:', { phoneNumber, email, hasPassword: !!password, hasVerificationCode: !!verificationCode, hasInviteCode: !!inviteCode });

    // Validar os dados de entrada
    if (!phoneNumber && !email) {
      return NextResponse.json(
        { error: 'Número de telefone ou email é obrigatório' },
        { status: 400 }
      );
    }

    // Se tiver senha, tentar login com senha
    if (password) {
      // Verificar se o usuário existe antes de tentar fazer login com senha
      // Usar o email se fornecido, caso contrário usar o número de telefone
      const identifier = email || phoneNumber;
      const result = await loginWithPassword(identifier, password);

      if (!result.success) {
        return NextResponse.json(
          { error: result.message },
          { status: 401 }
        );
      }

      return NextResponse.json({
        token: result.token,
        user: result.user,
        message: result.message
      });
    }

    // Se não tiver código de verificação, iniciar o processo de login
    if (!verificationCode) {
      const result = await initiatePhoneLogin(phoneNumber, email, inviteCode);

      return NextResponse.json(result);
    }

    // Se tiver código de verificação, verificar e completar o login
    const result = await verifyPhoneLogin(phoneNumber, verificationCode, email, inviteCode);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 401 }
      );
    }

    // Retornar o token e os dados do usuário
    return NextResponse.json({
      token: result.token,
      user: result.user,
      message: result.message
    });
  } catch (error) {
    console.error('Erro ao processar login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
