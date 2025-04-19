import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { sendNewUserWelcomeEmail } from '@/lib/notifications';

// GET - Obter todos os usuários
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

    // Verificar se o usuário é administrador
    const requestingUser = await User.findById(payload.userId);

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem listar usuários.' },
        { status: 403 }
      );
    }

    // Buscar todos os usuários
    const users = await User.find({}).select('-password -verificationCode -verificationCodeExpires');

    return NextResponse.json(users);
  } catch (error) {
    console.error('Erro ao obter usuários:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar um novo usuário
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

    // Conectar ao banco de dados
    await dbConnect();

    // Verificar se o usuário é administrador
    const requestingUser = await User.findById(payload.userId);

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem criar usuários.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      password,
      role,
      position,
      department
    } = body;

    // Validar os dados de entrada
    if (!phoneNumber || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Número de telefone, nome e sobrenome são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o usuário já existe
    const existingUser = await User.findOne({ phoneNumber });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Número de telefone já está em uso' },
        { status: 409 }
      );
    }

    // Definir permissões padrão com base no papel
    const defaultPermissions = {
      ADMIN: {
        modules: {
          dashboard: true,
          manual: true,
          procedimentos: true,
          politicas: true,
          calendario: true,
          noticias: true,
          reembolso: true,
          contracheque: true,
          ponto: true,
          admin: true
        }
      },
      MANAGER: {
        modules: {
          dashboard: true,
          manual: true,
          procedimentos: true,
          politicas: true,
          calendario: true,
          noticias: true,
          reembolso: true,
          contracheque: true,
          ponto: true,
          admin: false
        }
      },
      USER: {
        modules: {
          dashboard: true,
          manual: true,
          procedimentos: true,
          politicas: true,
          calendario: true,
          noticias: true,
          reembolso: true,
          contracheque: true,
          ponto: true,
          admin: false
        }
      }
    };

    // Determinar o papel do usuário
    const userRole = ['ADMIN', 'USER', 'MANAGER'].includes(role) ? role : 'USER';

    // Criar o usuário
    const newUser = new User({
      phoneNumber,
      firstName,
      lastName,
      email,
      password,  // Será hasheado automaticamente pelo middleware pre-save
      role: userRole,
      position,
      department,
      active: true,
      passwordLastChanged: new Date(),
      accessPermissions: defaultPermissions[userRole as 'ADMIN' | 'MANAGER' | 'USER'],
      accessHistory: [{
        timestamp: new Date(),
        action: 'CREATED',
        details: `Usuário criado por ${requestingUser.firstName} ${requestingUser.lastName}`
      }]
    });

    await newUser.save();

    // Registrar a ação no histórico do administrador
    requestingUser.accessHistory.push({
      timestamp: new Date(),
      action: 'CREATE_USER',
      details: `Criou o usuário ${firstName} ${lastName} (${phoneNumber})`
    });
    await requestingUser.save();

    // Enviar email de boas-vindas se o usuário tiver email
    if (email) {
      try {
        console.log(`Enviando email de boas-vindas para ${email}`);
        const emailResult = await sendNewUserWelcomeEmail(email, `${firstName} ${lastName}`);
        console.log(`Resultado do envio de email: ${emailResult.success ? 'Sucesso' : 'Falha'}`);
      } catch (emailError) {
        console.error('Erro ao enviar email de boas-vindas:', emailError);
        // Não interromper o fluxo se o email falhar
      }
    }

    // Retornar os dados do usuário (sem campos sensíveis)
    const userResponse = newUser.toObject();
    delete userResponse.password;
    delete userResponse.verificationCode;
    delete userResponse.verificationCodeExpires;

    return NextResponse.json(userResponse, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
