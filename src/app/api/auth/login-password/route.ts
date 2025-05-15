import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

// Função para gerar um token JWT
function generateToken(userId: string, phoneNumber: string, role: string) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
  }

  const payload = {
    userId,
    phoneNumber,
    role
  };

  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

// POST - Login com senha para administradores
export async function POST(request: NextRequest) {
  try {
    console.log('API login-password: Iniciando login com senha');

    // Obter dados do corpo da requisição
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      console.log('API login-password: Identificador ou senha não fornecidos');
      return NextResponse.json(
        { success: false, message: 'Identificador e senha são obrigatórios' },
        { status: 400 }
      );
    }

    console.log('API login-password: Tentando login com identificador:', identifier);

    // Verificar se o identificador é um email ou telefone
    const isEmail = identifier.includes('@');

    // Buscar o usuário no Supabase
    let user;

    if (isEmail) {
      console.log('API login-password: Buscando usuário pelo email');
      const { data, error } = await supabaseAdmin
        .from('users_unified')
        .select('*')
        .eq('email', identifier)
        .single();

      if (error) {
        console.error('API login-password: Erro ao buscar usuário pelo email:', error);
        return NextResponse.json(
          { success: false, message: 'Usuário não encontrado' },
          { status: 404 }
        );
      }

      user = data;
    } else {
      console.log('API login-password: Buscando usuário pelo telefone');
      const { data, error } = await supabaseAdmin
        .from('users_unified')
        .select('*')
        .eq('phone_number', identifier)
        .single();

      if (error) {
        console.error('API login-password: Erro ao buscar usuário pelo telefone:', error);
        return NextResponse.json(
          { success: false, message: 'Usuário não encontrado' },
          { status: 404 }
        );
      }

      user = data;
    }

    console.log('API login-password: Usuário encontrado:', user.id, user.email, user.role);

    // Verificar se o usuário é o administrador
    const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
    const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Caio@2122@';

    const isAdmin = user.email === adminEmail || user.phone_number === adminPhone;

    if (!isAdmin) {
      console.log('API login-password: Usuário não é o administrador');
      return NextResponse.json(
        { success: false, message: 'Apenas administradores podem usar este método de login' },
        { status: 403 }
      );
    }

    // Verificar a senha
    const passwordMatches = password === adminPassword;

    if (!passwordMatches) {
      console.log('API login-password: Senha incorreta');
      return NextResponse.json(
        { success: false, message: 'Senha incorreta' },
        { status: 401 }
      );
    }

    console.log('API login-password: Senha correta, gerando token');

    // Atualizar o papel do usuário para ADMIN se ainda não for
    if (user.role !== 'ADMIN') {
      console.log('API login-password: Atualizando papel do usuário para ADMIN');

      const { error: updateError } = await supabaseAdmin
        .from('users_unified')
        .update({
          role: 'ADMIN',
          access_permissions: {
            modules: {
              admin: true,
              dashboard: true,
              manual: true,
              procedimentos: true,
              politicas: true,
              calendario: true,
              noticias: true,
              reembolso: true,
              contracheque: true,
              ponto: true,
              avaliacao: true
            }
          }
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('API login-password: Erro ao atualizar papel do usuário:', updateError);
      } else {
        console.log('API login-password: Papel do usuário atualizado para ADMIN com sucesso');
        user.role = 'ADMIN';
      }
    }

    // Gerar token JWT
    const token = generateToken(user.id, user.phone_number, 'ADMIN');

    console.log('API login-password: Token gerado com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phone_number,
        role: 'ADMIN'
      }
    });
  } catch (error) {
    console.error('API login-password: Erro ao processar login:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
