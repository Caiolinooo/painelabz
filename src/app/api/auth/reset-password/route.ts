import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

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

    await dbConnect();

    // Buscar o usuário pelo token de redefinição
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
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

    // Atualizar a senha
    user.password = password;
    user.passwordLastChanged = new Date();
    
    // Limpar o token de redefinição
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // Registrar no histórico de acesso
    user.accessHistory.push({
      timestamp: new Date(),
      action: 'PASSWORD_RESET',
      details: 'Senha redefinida via link de recuperação'
    });
    
    await user.save();

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
