import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { initiatePhoneLogin, verifyPhoneLogin, loginWithPassword } from '@/lib/auth';
// import { Pool } from 'pg'; // Removido - não utilizado
import { getLatestCode } from '@/lib/code-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { verificationCode, password, email, inviteCode, rememberMe } = body;


    console.log('Recebida solicitação de login:', { email, hasPassword: !!password, hasVerificationCode: !!verificationCode, hasInviteCode: !!inviteCode });
    console.log('Senha (primeiros caracteres):', password ? password.substring(0, 3) + '...' : 'Não fornecida');
    console.log('Código de verificação:', verificationCode || 'Não fornecido');

    // Validar os dados de entrada
    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se é o administrador
    const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';

    const isAdminEmail = email === adminEmail;
    const isAdmin = isAdminEmail;

    console.log('Verificando se é login de administrador:', { isAdminEmail, isAdmin });

    // Verificação de administrador removida para unificar o fluxo de login
    // O administrador seguirá o mesmo fluxo de segurança que os outros usuários
    if (isAdminEmail) {
      console.log('Administrador fazendo login (fluxo unificado)');
    }

    // Se tiver senha, tentar login com senha
    if (password) {
      // Verificar se o usuário existe antes de tentar fazer login com senha
      // Usar o email
      const identifier = email;
      console.log('Tentando login com senha para:', identifier);
      console.log('Senha fornecida (primeiros caracteres):', password.substring(0, 3) + '...');

      try {
        const result = await loginWithPassword(identifier, password, rememberMe || false);
        console.log('Resultado do login:', result);

        if (!result.success) {
          return NextResponse.json(
            { error: result.message },
            { status: 401 }
          );
        }

        // Configurar cookie de autenticação (apenas se token existe)
        if (result.token) {
          const cookieStore = await cookies();
          const maxAge = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60; // 7 dias ou 1 dia em segundos
          const authToken: string = result.token; // Type narrowing explícito

          cookieStore.set('abzToken', authToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: maxAge,
            path: '/'
          });

          console.log('🍪 Cookie abzToken configurado com sucesso. Max-Age:', maxAge, 'segundos');
        }

        return NextResponse.json({
          token: result.token,
          refreshToken: result.refreshToken,
          user: result.user,
          message: result.message
        });
      } catch (error) {
        console.error('Erro ao fazer login com senha:', error);
        return NextResponse.json(
          { error: 'Erro interno ao processar login com senha' },
          { status: 500 }
        );
      }
    }

    // Se não tiver código de verificação, iniciar o processo de login
    if (!verificationCode) {
      console.log('Iniciando processo de login para:', email);

      const result = await initiatePhoneLogin('', email, inviteCode);
      console.log('Resultado do início do login:', result);

      // Em ambiente de desenvolvimento, incluir o código para facilitar testes
      if (process.env.NODE_ENV !== 'production' && result.success) {
        // Obter o código mais recente para o identificador
        const identifier = email;
        const code = getLatestCode(identifier);

        if (code) {
          console.log(`Código gerado para ${identifier}: ${code}`);
          (result as any).code = code;
          (result as any).debugUrl = 'http://localhost:3000/debug/codes';
        } else {
          console.warn(`Nenhum código encontrado para ${identifier} no serviço em memória`);

          // Verificar códigos ativos
          const { getActiveCodes } = await import('@/lib/code-service');
          const activeCodes = getActiveCodes();
          console.log('Códigos ativos em memória:', JSON.stringify(activeCodes, null, 2));
        }
      }

      return NextResponse.json(result);
    }

    // Se tiver código de verificação, verificar e completar o login
    console.log(`Verificando código de verificação: ${verificationCode} para ${email}`);

    // Verificar se o código está no serviço em memória
    const { getActiveCodes } = await import('@/lib/code-service');
    const activeCodes = getActiveCodes();
    console.log('Códigos ativos em memória antes da verificação:', JSON.stringify(activeCodes, null, 2));

    const result = await verifyPhoneLogin('', verificationCode, email, inviteCode);
    console.log('Resultado da verificação do código:', result);

    if (!result.success) {
      console.error('Falha na verificação do código:', result.message);
      return NextResponse.json(
        {
          error: result.message,
          authStatus: result.authStatus,
          details: 'Falha na verificação do código. Verifique se o código está correto e tente novamente.'
        },
        { status: 401 }
      );
    }

    console.log('Verificação de código bem-sucedida, retornando token e dados do usuário');

    // Retornar o token e os dados do usuário
    return NextResponse.json({
      success: true,
      token: result.token,
      user: result.user,
      message: result.message,
      requiresPassword: result.requiresPassword,
      isNewUser: result.isNewUser,
      authStatus: result.authStatus
    });
  } catch (error) {
    console.error('Erro ao processar login:', error);

    // Exibir detalhes do erro para depuração
    if (error instanceof Error) {
      console.error('Mensagem de erro:', error.message);
      console.error('Stack trace:', error.stack);
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor. Por favor, tente novamente.' },
      { status: 500 }
    );
  }
}
