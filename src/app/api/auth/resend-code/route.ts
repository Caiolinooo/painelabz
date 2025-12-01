import { NextRequest, NextResponse } from 'next/server';
import { resendVerificationCode } from '@/lib/verification';
import { findUserByQuery } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Obter dados da requisição
    const body = await request.json();
    const { identifier, method } = body;

    if (!identifier) {
      return NextResponse.json(
        { error: 'Email ou telefone é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o método é válido
    if (method && method !== 'email') {
      return NextResponse.json(
        { error: 'Método inválido. Apenas "email" é suportado.' },
        { status: 400 }
      );
    }

    // Determinar se o identificador é um email (única opção suportada agora)
    const isEmail = identifier.includes('@');

    if (!isEmail) {
      return NextResponse.json(
        { error: 'Apenas email é suportado para login.' },
        { status: 400 }
      );
    }

    // Buscar o usuário
    let user;

    try {
      // Buscar o usuário pelo identificador
      console.log(`Buscando usuário por email: ${identifier}`);

      const { data, error } = await supabaseAdmin
        .from('users_unified')
        .select('*')
        .eq('email', identifier)
        .single();

      if (error) {
        console.error('Erro ao buscar usuário pelo email:', error);
      } else if (data) {
        user = {
          id: data.id,
          email: data.email,
          firstName: data.first_name,
          lastName: data.last_name
        };
        console.log('Usuário encontrado:', user.id);
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Determinar o método de envio
    const sendMethod = 'email';

    // Verificar se o usuário tem o método de contato escolhido
    if (!user.email) {
      return NextResponse.json(
        { error: 'Usuário não tem email cadastrado' },
        { status: 400 }
      );
    }

    // Reenviar o código
    const sendTo = user.email;
    const result = await resendVerificationCode(user.id, sendMethod);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    // Retornar resposta de sucesso
    const response: any = {
      success: true,
      message: result.message,
      method: sendMethod
    };

    // Em ambiente de desenvolvimento, incluir o código e URL de preview
    if (process.env.NODE_ENV !== 'production') {
      if (result.code) response.code = result.code;
      if (result.previewUrl) response.previewUrl = result.previewUrl;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao reenviar código de verificação:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
