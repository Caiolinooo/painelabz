/**
 * IMPORTANTE: Este arquivo deve ser usado apenas no servidor.
 * Não importe este arquivo diretamente em componentes do cliente.
 * Use src/lib/email-client.ts para componentes do cliente.
 *
 * Configuração otimizada para Microsoft Exchange/Office 365
 */

import nodemailer from 'nodemailer';
import { buildAppUrl } from './app-url';

// Validate required environment variables
function validateEmailConfig() {
  const requiredVars = ['EMAIL_USER', 'EMAIL_PASSWORD'];
  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    } else {
      console.warn(`Missing email environment variables: ${missing.join(', ')}. Using default development credentials.`);
    }
  }
}

// Configuração do Exchange/Office 365 com otimizações para evitar spam
const emailConfig = {
  host: process.env.EMAIL_HOST || '***REMOVED***',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // geralmente false para porta 587 (STARTTLS)
  auth: {
    user: process.env.EMAIL_USER || '***REMOVED***',
    pass: process.env.EMAIL_PASSWORD || ''
  },
  // Log detalhado para depuração
  debug: process.env.NODE_ENV !== 'production',
  logger: process.env.NODE_ENV !== 'production',
  // Configurações para melhorar a entregabilidade
  pool: true, // Usar conexões persistentes
  maxConnections: 2, // Office 365 tem limite de 3 conexões simultâneas, mantemos em 2 para margem de segurança
  maxMessages: 50, // Reduzido de 100 para evitar limites de taxa por sessão
  // Configurações de timeout
  connectionTimeout: 10000, // 10 segundos
  greetingTimeout: 10000,
  socketTimeout: 10000,
  // Configurações de segurança para Exchange/Office 365
  tls: {
    rejectUnauthorized: false, // Mais permissivo para evitar problemas
    minVersion: 'TLSv1.2' as const
  },
  // Configurações específicas para Exchange/Office 365
  requireTLS: true, // Exigir TL S
  opportunisticTLS: true // Usar TLS quando disponível
} as const;

// Validate configuration on import (only in server environment)
if (typeof window === 'undefined') {
  try {
    validateEmailConfig();
    console.log('Email configuration validated successfully');
  } catch (error) {
    console.error('Email configuration validation failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Log para debug
console.log('Configuração de email carregada:', {
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  user: emailConfig.auth.user
});

// Variável global para armazenar a instância do transporter e evitar limite de conexões
const globalForNodemailer = global as unknown as { transporter: nodemailer.Transporter | null };

/**
 * Inicializa o transporte de e-mail com Exchange/Office 365
 * @returns Transporter configurado
 */
export async function createTransport() {
  // Retornar a instância existente se houver (para evitar estourar o limite de conexões concorrentes)
  if (globalForNodemailer.transporter) {
    return globalForNodemailer.transporter;
  }

  // Validar credenciais antes de tentar conectar
  if (!emailConfig.auth.pass) {
    throw new Error(
      `EMAIL_PASSWORD não configurado. ` +
      `Adicione EMAIL_PASSWORD=<sua-senha> no arquivo .env.local e reinicie o servidor.`
    );
  }

  try {
    console.log('Inicializando transporte de email com Exchange/Office 365');
    console.log('Ambiente:', process.env.NODE_ENV || 'development');
    console.log('Configuração detalhada:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user,
      // Não logar a senha por segurança
      debug: emailConfig.debug,
      logger: emailConfig.logger
    });

    // Criar transporter com configuração otimizada para Exchange
    const transporter = nodemailer.createTransport(emailConfig);

    // Verificar conexão apenas na inicialização (primeira vez)
    console.log('Verificando conexão com o servidor SMTP...');
    await transporter.verify();
    console.log('Conexão com o servidor SMTP verificada com sucesso');

    // Armazenar na global para reuso
    globalForNodemailer.transporter = transporter;

    return transporter;
  } catch (error) {
    globalForNodemailer.transporter = null;
    const errMsg = error instanceof Error ? error.message : 'Erro desconhecido';

    console.error('ERRO CRÍTICO - Falha ao inicializar transporte de email Exchange');
    console.error('Detalhes:', errMsg);

    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }

    console.error('Verifique as configurações de email no arquivo .env:');
    console.error('  EMAIL_HOST:', emailConfig.host);
    console.error('  EMAIL_PORT:', emailConfig.port);
    console.error('  EMAIL_USER:', emailConfig.auth.user);
    console.error('  EMAIL_PASSWORD:', emailConfig.auth.pass ? 'Configurado' : 'NÃO CONFIGURADO');

    // Detectar erro de autenticação 535 (senha inválida/expirada)
    if (errMsg.includes('535') || errMsg.includes('Authentication unsuccessful')) {
      throw new Error(
        `Credenciais de email inválidas ou expiradas. ` +
        `Atualize a senha de EMAIL_PASSWORD no arquivo .env.local e reinicie o servidor. ` +
        `Detalhes: ${errMsg}`
      );
    }

    throw new Error(
      `Falha ao conectar com servidor Exchange/Office365. ` +
      `Verifique as credenciais e configurações de rede. ` +
      `Detalhes: ${errMsg}`
    );
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
  html: string,
  options?: {
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{
      filename: string;
      content?: any;
      path?: string;
      contentType?: string;
    }>;
  }
): Promise<{ success: boolean; message: string; messageId?: string; previewUrl?: string }> {
  try {
    // Criar transporte
    const transport = await createTransport();

    // Preparar opções do e-mail otimizadas para Exchange/Office 365
    const mailOptions = {
      from: options?.from || process.env.EMAIL_FROM || '"ABZ Group" <***REMOVED***>',
      to,
      cc: options?.cc,
      bcc: options?.bcc,
      subject,
      text,
      html,
      attachments: options?.attachments,
      // Cabeçalhos otimizados para Exchange/Office 365
      headers: {
        // Prioridade normal (IMPORTANTE: não usar 'high' ou 'urgent')
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal',

        // Identificação do remetente (importante para SPF/DKIM)
        'X-Mailer': 'ABZ Group Internal System v3.0',
        'X-Sender': process.env.EMAIL_USER || '***REMOVED***',
        'Return-Path': process.env.EMAIL_USER || '***REMOVED***',

        // Opção de descadastramento (RFC 8058)
        'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER || '***REMOVED***'}?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',

        // Cabeçalhos específicos para Exchange/Office365
        'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply',

        // Indicar tipo de email (importante para filtros)
        'X-Email-Type': 'transactional',
        'X-Email-Source': 'ABZ-Internal-System',

        // MIME versão (compatibilidade)
        'MIME-Version': '1.0',

        // Prevenir tracking (boa prática)
        'X-No-Archive': 'True',

        // Message ID único
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substring(2, 15)}@groupabz.com>`
      },
      // Configurações adicionais
      encoding: 'utf-8',
      priority: 'normal' as const,
      disableFileAccess: true,
      disableUrlAccess: true,
      // Adicionar um endereço de resposta
      replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER || '***REMOVED***'
    };

    console.log('Enviando e-mail para:', Array.isArray(to) ? to.join(', ') : to);

    // Enviar e-mail
    const info = await transport.sendMail(mailOptions);
    const messageId = (info as any)?.messageId || 'unknown';
    console.log('E-mail enviado com sucesso. ID:', messageId);

    return {
      success: true,
      message: 'Email enviado com sucesso',
      messageId
    };
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return {
      success: false,
      message: `Erro ao enviar email: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Envia um e-mail com código de verificação
 * @param email E-mail do destinatário
 * @param code Código de verificação
 * @returns Resultado do envio
 */
export async function sendVerificationEmail(email: string, code: string) {
  // Texto simples para clientes que não suportam HTML
  const text = `
Código de Verificação ABZ Group

Seu código de verificação é: ${code}

Este código expira em 10 minutos.

Se você não solicitou este código, por favor ignore este email.

--
ABZ Group
https://abzgroup.com.br
${new Date().getFullYear()} © Todos os direitos reservados.
  `.trim();

  // HTML otimizado para Exchange/Office 365
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Código de Verificação - ABZ Group</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333; ***REMOVED*** #f9f9f9;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="***REMOVED*** #f9f9f9;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="***REMOVED*** #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); max-width: 600px; margin: 0 auto;">
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <img src="${process.env.EMAIL_LOGO_URL || 'https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png'}" alt="ABZ Group Logo" width="200" style="display: block; max-width: 200px; height: auto;">
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 20px 20px 20px;">
                  <h1 style="color: #0066cc; font-size: 24px; margin: 0;">Seu Código de Verificação</h1>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="***REMOVED*** #f5f5f5; border-radius: 5px; margin: 20px 0;">
                    <tr>
                      <td align="center" style="padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333333;">
                        ${code}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 20px 20px 20px;">
                  <p style="margin: 0 0 20px 0; text-align: center;">Este código expira em <strong>10 minutos</strong>.</p>
                  <p style="margin: 0; text-align: center; color: #666666; font-size: 14px;">Se você não solicitou este código, por favor ignore este email.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px; border-top: 1px solid #e0e0e0;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="font-size: 12px; color: #999999;">
                        <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} ABZ Group. Todos os direitos reservados.</p>
                        <p style="margin: 0;">
                          <a href="https://abzgroup.com.br" style="color: #0066cc; text-decoration: none;">abzgroup.com.br</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    return await sendEmail(email, 'Código de Verificação - ABZ Group', text, html);
  } catch (error) {
    console.error('Erro ao enviar e-mail de verificação:', error);
    return {
      success: false,
      message: `Erro ao enviar email de verificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Função para enviar um email de convite para novos usuários
 */
export async function sendInvitationEmail(
  email: string,
  inviteCode: string,
  name?: string
) {
  const inviteUrl = buildAppUrl(`/set-password?invite=${inviteCode}`);

  const text = `Olá ${name || ''},\n\nVocê foi convidado para acessar o Portal ABZ.\n\nSeu código de convite é: ${inviteCode}\n\nAcesse o portal em: ${inviteUrl}\n\nEste convite não expira, mas pode ser revogado pelo administrador.\n\nAtenciosamente,\nEquipe ABZ Group`;

  // Usar a função genérica para enviar o email
  try {
    // Importar o template de convite
    const { inviteTemplate } = await import('./emailTemplates');

    // Gerar HTML usando o template
    const html = inviteTemplate(inviteCode, inviteUrl, '', undefined);

    const result = await sendEmail(email, 'Convite para o Portal ABZ', text, html);
    return result;
  } catch (error) {
    console.error('Erro ao enviar email de convite:', error);
    return {
      success: false,
      message: `Erro ao enviar email de convite: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

/**
 * Testa a conexão com o servidor SMTP
 * @returns Resultado do teste
 */
export async function testEmailConnection() {
  try {
    console.log('Testando conexão com o servidor de email...');
    console.log('Configuração:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user,
      // Não logar a senha por segurança
      environment: process.env.NODE_ENV || 'development'
    });

    const transport = await createTransport();
    await transport.verify();

    console.log('Teste de conexão bem-sucedido!');

    return {
      success: true,
      message: 'Conexão com o servidor Exchange/Office 365 verificada com sucesso',
      config: {
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        user: emailConfig.auth.user,
        environment: process.env.NODE_ENV || 'development'
      }
    };
  } catch (error) {
    console.error('Erro ao testar conexão com o servidor de email:', error);

    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      config: {
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        user: emailConfig.auth.user,
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }
}

// Função para gerar um código de verificação
export function generateVerificationCode(): string {
  // Gera um código de 6 dígitos
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Envia um e-mail de redefinição de senha
 * @param email E-mail do destinatário
 * @param resetUrl URL para redefinição
 * @returns Resultado do envio
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  // Texto simples para clientes que não suportam HTML
  const text = `
Redefinição de Senha - ABZ Group

Você solicitou a redefinição de sua senha.

Clique no link abaixo para redefinir sua senha:
${resetUrl}

Este link é válido por 1 hora.

Se você não solicitou esta redefinição, por favor ignore este email ou contate o suporte se tiver dúvidas.

--
ABZ Group
https://abzgroup.com.br
${new Date().getFullYear()} © Todos os direitos reservados.
  `.trim();

  // HTML otimizado para Exchange/Office 365
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Redefinição de Senha - ABZ Group</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333; ***REMOVED*** #f9f9f9;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="***REMOVED*** #f9f9f9;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="***REMOVED*** #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); max-width: 600px; margin: 0 auto;">
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <img src="${process.env.EMAIL_LOGO_URL || 'https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png'}" alt="ABZ Group Logo" width="200" style="display: block; max-width: 200px; height: auto;">
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 20px 20px 20px;">
                  <h1 style="color: #0066cc; font-size: 24px; margin: 0;">Redefinição de Senha</h1>
                </td>
              </tr>
              <tr>
                <td align="left" style="padding: 0 20px 20px 20px;">
                  <p style="margin: 0 0 15px 0;">Olá,</p>
                  <p style="margin: 0 0 15px 0;">Recebemos uma solicitação para redefinir a senha da sua conta no Portal ABZ.</p>
                  <p style="margin: 0 0 25px 0;">Clique no botão abaixo para criar uma nova senha:</p>
                  
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
                    <tr>
                      <td style="border-radius: 5px; background: #0066cc; text-align: center;">
                        <a href="${resetUrl}" style="background: #0066cc; border: 1px solid #0066cc; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.1; text-align: center; text-decoration: none; display: block; border-radius: 5px; font-weight: bold;" class="button-a">
                          <span style="color:#ffffff; padding: 12px 24px; display: block;">Redefinir Minha Senha</span>
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 25px 0 0 0; font-size: 14px; color: #666666;">Este link é válido por <strong>1 hora</strong>.</p>
                  <p style="margin: 10px 0 0 0; font-size: 14px; color: #666666;">Se você não solicitou esta redefinição, por favor ignore este email. Sua senha permanecerá inalterada.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px; border-top: 1px solid #e0e0e0;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="font-size: 12px; color: #999999;">
                        <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} ABZ Group. Todos os direitos reservados.</p>
                        <p style="margin: 0;">
                          <a href="https://abzgroup.com.br" style="color: #0066cc; text-decoration: none;">abzgroup.com.br</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    return await sendEmail(email, 'Redefinição de Senha - ABZ Group', text, html);
  } catch (error) {
    console.error('Erro ao enviar e-mail de redefinição:', error);
    const errMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    // Evitar duplicação — se já contém a mensagem do transport, usar direto
    const message = errMsg.startsWith('Falha ao conectar') || errMsg.startsWith('Credenciais')
      ? errMsg
      : `Erro ao enviar email de redefinição: ${errMsg}`;
    return {
      success: false,
      message
    };
  }
}
