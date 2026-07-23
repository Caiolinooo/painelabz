import {
  createTransport as createExchangeTransport,
  sendEmail as sendExchangeEmail,
  sendVerificationEmail as sendExchangeVerificationEmail,
  resetEmailTransport,
  testEmailConnection,
} from './email-exchange';

/**
 * Serviço de envio de e-mails
 * NOTA: Este arquivo é um wrapper para manter compatibilidade com código legado.
 * A implementação real está em email-exchange.ts que usa Exchange/Office365 exclusivamente.
 */

export { resetEmailTransport, testEmailConnection };

/**
 * Inicializa o transporte de e-mail usando Exchange/Office 365
 * @returns Transporter configurado
 */
export async function createTransport() {
  try {
    console.log('email-service.ts: Redirecionando para email-exchange.ts');
    return await createExchangeTransport();
  } catch (error) {
    console.error('email-service.ts: Erro ao criar transporte via Exchange');
    throw error;
  }
}

/**
 * Envia um e-mail usando Exchange/Office 365
 * @param to Destinatário(s)
 * @param subject Assunto
 * @param text Conteúdo em texto
 * @param html Conteúdo em HTML
 * @returns Resultado do envio
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  text: string,
  html: string
) {
  try {
    console.log('email-service.ts: Redirecionando para email-exchange.ts');
    return await sendExchangeEmail(to, subject, text, html);
  } catch (error) {
    console.error('email-service.ts: Erro ao enviar email via Exchange');
    throw error;
  }
}

/**
 * Envia um e-mail com código de verificação
 * @param email E-mail do destinatário
 * @param code Código de verificação
 * @returns Resultado do envio
 */
export async function sendVerificationEmail(email: string, code: string) {
  try {
    console.log('email-service.ts: Redirecionando para email-exchange.ts');
    return await sendExchangeVerificationEmail(email, code);
  } catch (error) {
    console.error('email-service.ts: Erro ao enviar email de verificação via Exchange');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Testa a conexão com o servidor SMTP
 * @returns Resultado do teste
 */
export async function testConnection() {
  try {
    const transport = await createTransport();
    await transport.verify();

    return {
      success: true,
      message: 'Conexão com o servidor SMTP verificada com sucesso'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
