'use client';

/**
 * Cliente de verificação para uso no lado do cliente
 * Este arquivo não importa diretamente módulos Node.js, evitando problemas no browser
 */

/**
 * Envia um código de verificação através da API
 * @param identifier Email ou telefone do destinatário
 * @param userId ID do usuário
 * @param method Método de envio (sms ou email)
 * @returns Resultado do envio
 */
export async function sendVerificationCode(identifier: string, userId: string, method: 'sms' | 'email' = 'sms') {
  try {
    const response = await fetch('/api/verification/send-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, userId, method }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao enviar código de verificação:', error);
    return {
      success: false,
      message: `Erro ao enviar código de verificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
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
