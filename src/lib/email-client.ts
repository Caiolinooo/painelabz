'use client';

/**
 * Cliente de email para uso no lado do cliente
 * Este arquivo não importa diretamente o nodemailer, evitando problemas com módulos Node.js no browser
 *
 * IMPORTANTE: Este arquivo deve ser usado APENAS no lado do cliente.
 * Para envio de emails no servidor, use src/lib/email.ts
 *
 * Este arquivo fornece uma interface para as APIs de email do servidor.
 */

/**
 * Envia um email de verificação através da API
 * @param email Email do destinatário
 * @param code Código de verificação
 * @returns Resultado do envio
 */
export async function sendVerificationEmail(email: string, code: string) {
  try {
    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send-verification',
        email,
        code
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao enviar email de verificação:', error);
    return {
      success: false,
      message: `Erro ao enviar email de verificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Envia um email de convite através da API
 * @param email Email do destinatário
 * @param inviteCode Código de convite
 * @param name Nome do destinatário (opcional)
 * @returns Resultado do envio
 */
export async function sendInvitationEmail(email: string, inviteCode: string, name?: string) {
  try {
    const response = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send-invitation',
        email,
        inviteCode,
        name
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao enviar email de convite:', error);
    return {
      success: false,
      message: `Erro ao enviar email de convite: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Testa a conexão com o servidor de email através da API
 * @returns Resultado do teste
 */
export async function testEmailConnection() {
  try {
    const response = await fetch('/api/email?action=test-connection', {
      method: 'GET',
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao testar conexão com servidor de email:', error);
    return {
      success: false,
      message: `Erro ao testar conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Gera um código de verificação de 6 dígitos
 * @returns Código de verificação
 */
export function generateVerificationCode(): string {
  // Gera um código de 6 dígitos
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Envia um email de redefinição de senha através da API
 * @param email Email do destinatário
 * @param resetUrl URL para redefinição de senha
 * @returns Resultado do envio
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  try {
    const response = await fetch('/api/email/password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, resetUrl }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao enviar email de redefinição de senha:', error);
    return {
      success: false,
      message: `Erro ao enviar email de redefinição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}
