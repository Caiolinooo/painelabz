import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken, getDefaultPermissions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    // Extrair o token do cabeçalho
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    // Verificar o token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Conectar ao banco de dados
    await dbConnect();

    // Buscar o usuário pelo ID
    console.log('Buscando usuário pelo ID:', payload.userId);
    const user = await User.findById(payload.userId);

    console.log('Usuário encontrado:', user ? 'Sim' : 'Não');
    if (user) {
      console.log('Papel do usuário:', user.role);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Converter para objeto simples e remover a senha
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.verificationCode;
    delete userObj.verificationCodeExpires;

    // Verificar se o usuário tem permissões definidas, caso contrário, definir permissões padrão
    console.log('Verificando permissões do usuário:', userObj.accessPermissions ? 'Existem' : 'Não existem');

    if (!userObj.accessPermissions) {
      console.log('Definindo permissões padrão para o papel:', userObj.role);
      userObj.accessPermissions = getDefaultPermissions(userObj.role);
      console.log('Permissões padrão definidas:', userObj.accessPermissions);

      // Atualizar o usuário no banco de dados com as permissões padrão
      await User.findByIdAndUpdate(user._id, { accessPermissions: userObj.accessPermissions });
      console.log('Usuário atualizado com permissões padrão');
    } else {
      console.log('Permissões existentes:', userObj.accessPermissions);
    }

    console.log('Retornando usuário com papel:', userObj.role);
    console.log('Permissões de acesso:', userObj.accessPermissions);
    return NextResponse.json({ user: userObj });
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
