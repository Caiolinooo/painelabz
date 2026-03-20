import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendPasswordResetSMS } from '@/lib/auth';
import { buildAppUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validar os dados de entrada
    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar o usuário pelo email
    const { data: user, error: userError } = await supabase
      .from('users_unified')
      .select('id, active, email, access_history')
      .eq('email', email)
      .single();

    // Se o usuário não for encontrado, retornar sucesso para evitar enumeração de usuários
    if (userError || !user) {
      console.log('Usuário não encontrado para recuperação de senha:', email);
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
      });
    }

    // Verificar se o usuário está ativo
    if (!user.active) {
      console.log('Usuário inativo tentando recuperar senha:', email);
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha.'
      });
    }

    // Enviar email de redefinição de senha usando Supabase
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: buildAppUrl('/reset-password', request.headers),
      }
    );

    if (error) {
      console.error('Erro ao enviar email de redefinição:', error);
      return NextResponse.json(
        { error: 'Erro ao enviar email de redefinição. Por favor, tente novamente.' },
        { status: 500 }
      );
    }

    // Registrar no histórico de acesso
    const timestamp = new Date().toISOString();
    const { error: historyError } = await supabase
      .from('users_unified')
      .update({
        access_history: [
          ...(user.access_history || []),
          {
            timestamp,
            action: 'PASSWORD_RESET_REQUEST',
            details: 'Solicitação de redefinição de senha via Email'
          }
        ]
      })
      .eq('id', user.id);

    if (historyError) {
      console.error('Erro ao registrar histórico de acesso:', historyError);
    }

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
