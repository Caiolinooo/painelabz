import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { generateToken } from '@/lib/jwt';
import { sendNewUserWelcomeEmail } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, name, email, password, role = 'USER', department } = body;

    // Validar os dados de entrada
    if (!username || !name || !email || !password) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Nome de usuário ou e-mail já está em uso' },
        { status: 409 }
      );
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password);

    // Definir permissões padrão para usuários
    const defaultPermissions = {
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
    };

    // Criar o usuário (sempre com papel USER, exceto se for o admin principal)
    const user = await prisma.user.create({
      data: {
        username,
        name,
        email,
        password: hashedPassword,
        // Apenas o admin principal pode ser criado como ADMIN
        role: (role === 'ADMIN' && email === process.env.ADMIN_EMAIL) ? 'ADMIN' : 'USER',
        department,
        accessPermissions: defaultPermissions,
        active: false, // Usuário inativo por padrão, aguardando aprovação
        passwordLastChanged: new Date()
      },
    });

    // Gerar o token JWT
    const token = generateToken(user);

    // Enviar email de boas-vindas
    try {
      console.log(`Enviando email de boas-vindas para ${email}`);
      const emailResult = await sendNewUserWelcomeEmail(email, name);
      console.log(`Resultado do envio de email: ${emailResult.success ? 'Sucesso' : 'Falha'}`);
    } catch (emailError) {
      console.error('Erro ao enviar email de boas-vindas:', emailError);
      // Não interromper o fluxo se o email falhar
    }

    // Retornar o token e os dados do usuário (sem a senha)
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message: 'Cadastro realizado com sucesso. Aguarde a aprovação do administrador para acessar o sistema.',
      user: userWithoutPassword,
      requiresApproval: true
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
