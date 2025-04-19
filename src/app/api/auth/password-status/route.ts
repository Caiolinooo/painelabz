import { NextRequest, NextResponse } from 'next/server';
import { isPasswordExpired, verifyToken, extractTokenFromHeader } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

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

    // Conectar ao banco de dados
    await dbConnect();

    // Buscar o usuário
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se a senha expirou (passando o papel do usuário)
    const expired = isPasswordExpired(user.passwordLastChanged, user.role);

    return NextResponse.json({
      expired,
      passwordLastChanged: user.passwordLastChanged,
      expiryDays: parseInt(process.env.PASSWORD_EXPIRY_DAYS || '365')
    });
  } catch (error) {
    console.error('Erro ao verificar status da senha:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
