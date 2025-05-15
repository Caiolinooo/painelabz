/**
 * IMPORTANTE: Este arquivo deve ser usado apenas no servidor.
 * Não importe este arquivo diretamente em componentes do cliente.
 * Use src/lib/email-client.ts para componentes do cliente.
 */

import nodemailer from 'nodemailer';

// Configuração do Gmail com otimizações avançadas para evitar spam
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para outras portas
  auth: {
    user: process.env.EMAIL_USER || 'apiabzgroup@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'zbli vdst fmco dtfc'
  },
  // Configurações para melhorar a entregabilidade
  pool: true, // Usar conexões persistentes
  maxConnections: 5,
  maxMessages: 100,
  // Configurações de timeout
  connectionTimeout: 10000, // 10 segundos
  greetingTimeout: 10000,
  socketTimeout: 10000,
  // Configurações de segurança
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    ciphers: 'SSLv3', // Usar cifras mais fortes
    minVersion: 'TLSv1.2' // Usar versão mínima de TLS 1.2
  },
  // Configurações de DKIM (se disponíveis)
  dkim: process.env.DKIM_PRIVATE_KEY ? {
    domainName: process.env.DKIM_DOMAIN || 'abzgroup.com.br',
    keySelector: process.env.DKIM_SELECTOR || 'default',
    privateKey: process.env.DKIM_PRIVATE_KEY,
  } : undefined,
  // Configurações adicionais
  name: 'ABZ Group Mailer', // Identificação do servidor
  localAddress: process.env.EMAIL_LOCAL_ADDRESS, // Endereço IP local (se necessário)
  // Desativar verificação de certificado em ambiente de desenvolvimento
  ignoreTLS: process.env.NODE_ENV !== 'production',
  // Usar STARTTLS quando disponível
  opportunisticTLS: true
};

// Log para debug
console.log('Configuração de email carregada:', {
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  user: emailConfig.auth.user
});

/**
 * Inicializa o transporte de e-mail
 * @returns Transporter configurado
 */
export async function createTransport() {
  try {
    console.log('Inicializando transporte de email com Gmail');
    console.log('Ambiente:', process.env.NODE_ENV || 'development');

    // Criar transporter com configuração otimizada para Gmail
    const transporter = nodemailer.createTransport(emailConfig);

    // Verificar conexão
    console.log('Verificando conexão com o servidor SMTP...');
    await transporter.verify();
    console.log('Conexão com o servidor SMTP verificada com sucesso');

    return transporter;
  } catch (error) {
    console.error('Erro ao inicializar transporte de email:', error);

    // Tentar criar uma conta de teste Ethereal
    try {
      console.log('Tentando criar conta de teste Ethereal...');
      const testAccount = await nodemailer.createTestAccount();

      const etherealTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      console.log('Conta de teste Ethereal criada:', {
        user: testAccount.user,
        pass: testAccount.pass
      });

      // Verificar conexão
      await etherealTransporter.verify();
      console.log('Conexão com Ethereal verificada com sucesso');

      return etherealTransporter;
    } catch (fallbackError) {
      console.error('Erro ao criar conta de teste Ethereal:', fallbackError);
      throw new Error('Não foi possível inicializar nenhum transporte de email');
    }
  }
}

/**
 * Envia um e-mail
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
) {
  try {
    // Criar transporte
    const transport = await createTransport();

    // Preparar opções do e-mail com cabeçalhos anti-spam aprimorados
    const mailOptions = {
      from: options?.from || process.env.EMAIL_FROM || '"ABZ Group" <apiabzgroup@gmail.com>',
      to,
      cc: options?.cc,
      bcc: options?.bcc,
      subject,
      text,
      html,
      attachments: options?.attachments,
      // Cabeçalhos para melhorar a entregabilidade e evitar spam
      headers: {
        // Prioridade do email (usar com moderação, pois pode aumentar chance de spam)
        'X-Priority': '3', // Mudado para prioridade normal (3) em vez de alta (1)
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal',
        // Identificação do remetente
        'X-Mailer': 'ABZ Group Mailer',
        'X-Sender': process.env.EMAIL_USER || 'apiabzgroup@gmail.com',
        // Opção de descadastramento (importante para evitar spam)
        'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER || 'apiabzgroup@gmail.com'}?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        // Identificação da mensagem
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substring(2)}@${process.env.DKIM_DOMAIN || 'abzgroup.com.br'}>`,
        // Feedback loop
        'Feedback-ID': `${Date.now()}:abzgroup:${process.env.NODE_ENV || 'production'}`,
        // Cabeçalhos adicionais para autenticação
        'X-Report-Abuse': `Please report abuse to ${process.env.EMAIL_CONTACT || 'contato@abzgroup.com.br'}`,
        'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply',
        // Cabeçalhos para conformidade com regulamentações
        'Precedence': 'bulk',
        // Cabeçalhos para melhorar a entregabilidade
        'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        // Cabeçalho para indicar que é um email transacional (não marketing)
        'X-Email-Type': 'transactional'
      },
      // Configurações adicionais
      encoding: 'utf-8',
      priority: 'normal', // Mudado para normal em vez de high
      disableFileAccess: true,
      disableUrlAccess: true,
      // Adicionar um ID de mensagem personalizado
      messageId: `<${Date.now()}.${Math.random().toString(36).substring(2)}@${process.env.DKIM_DOMAIN || 'abzgroup.com.br'}>`,
      // Adicionar um endereço de resposta
      replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER || 'apiabzgroup@gmail.com'
    };

    console.log('Enviando e-mail para:', Array.isArray(to) ? to.join(', ') : to);

    // Enviar e-mail
    const info = await transport.sendMail(mailOptions);
    console.log('E-mail enviado com sucesso. ID:', info.messageId);

    // Obter URL de preview (disponível apenas com Ethereal)
    let previewUrl;
    try {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('URL de preview:', previewUrl);
      }
    } catch (previewError) {
      // Ignorar erro (normal para Gmail)
    }

    return {
      success: true,
      message: 'Email enviado com sucesso',
      messageId: info.messageId,
      previewUrl
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

  // HTML otimizado para entregabilidade e compatibilidade
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Código de Verificação - ABZ Group</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333; background-color: #f9f9f9;">
      <!-- Wrapper para compatibilidade com clientes de email -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9f9f9;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <!-- Container principal -->
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); max-width: 600px; margin: 0 auto;">
              <!-- Cabeçalho com logo -->
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <img src="${process.env.EMAIL_LOGO_URL || 'https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png'}" alt="ABZ Group Logo" width="200" style="display: block; max-width: 200px; height: auto;">
                </td>
              </tr>

              <!-- Título -->
              <tr>
                <td align="center" style="padding: 0 20px 20px 20px;">
                  <h1 style="color: #0066cc; font-size: 24px; margin: 0;">Seu Código de Verificação</h1>
                </td>
              </tr>

              <!-- Código de verificação -->
              <tr>
                <td align="center" style="padding: 0 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5; border-radius: 5px; margin: 20px 0;">
                    <tr>
                      <td align="center" style="padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333333;">
                        ${code}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Informações -->
              <tr>
                <td align="center" style="padding: 0 20px 20px 20px;">
                  <p style="margin: 0 0 20px 0; text-align: center;">Este código expira em <strong>10 minutos</strong>.</p>
                  <p style="margin: 0; text-align: center; color: #666666; font-size: 14px;">Se você não solicitou este código, por favor ignore este email.</p>
                </td>
              </tr>

              <!-- Rodapé -->
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
  // Obter a URL do portal a partir das variáveis de ambiente
  const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000';
  const inviteUrl = `${portalUrl}/set-password?invite=${inviteCode}`;

  const text = `Olá ${name || ''},\n\nVocê foi convidado para acessar o Painel ABZ Group.\n\nSeu código de convite é: ${inviteCode}\n\nAcesse o portal em: ${inviteUrl}\n\nEste convite não expira, mas pode ser revogado pelo administrador.\n\nAtenciosamente,\nEquipe ABZ Group`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Convite para o Painel ABZ Group</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9; color: #333333;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); overflow: hidden;">
              <!-- Cabeçalho -->
              <tr>
                <td align="center" style="padding: 30px 20px; background-color: #ffffff;">
                  <img src="${process.env.EMAIL_LOGO_URL || 'https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png'}" alt="ABZ Group Logo" style="max-width: 200px; height: auto;">
                </td>
              </tr>

              <!-- Conteúdo -->
              <tr>
                <td style="padding: 20px 30px;">
                  <h2 style="color: #0066cc; text-align: center; margin-top: 0;">Convite para o Painel ABZ Group</h2>
                  <p style="margin-bottom: 20px;">Olá ${name || ''},</p>
                  <p style="margin-bottom: 20px;">Você foi convidado para acessar o Painel ABZ Group, nossa plataforma interna para colaboradores.</p>

                  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin-bottom: 10px; font-weight: bold;">Seu código de convite:</p>
                    <div style="background-color: #ffffff; padding: 10px; border-radius: 5px; text-align: center; font-size: 18px; letter-spacing: 2px; font-weight: bold; border: 1px dashed #0066cc;">
                      ${inviteCode}
                    </div>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${inviteUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Acessar o Portal</a>
                  </div>

                  <p style="margin-bottom: 20px;">Se o botão acima não funcionar, copie e cole o seguinte link no seu navegador:</p>
                  <p style="margin-bottom: 20px; word-break: break-all;"><a href="${inviteUrl}" style="color: #0066cc;">${inviteUrl}</a></p>

                  <p style="margin-bottom: 20px;">Este convite não expira, mas pode ser revogado pelo administrador.</p>

                  <p style="margin-bottom: 5px;">Atenciosamente,</p>
                  <p style="margin-bottom: 20px;"><strong>Equipe ABZ Group</strong></p>
                </td>
              </tr>

              <!-- Informações de Segurança -->
              <tr>
                <td style="padding: 15px 30px; background-color: #f5f5f5; border-top: 1px solid #e0e0e0;">
                  <p style="font-size: 13px; color: #666666; margin: 0 0 10px 0;"><strong>Informações de Segurança:</strong></p>
                  <p style="font-size: 13px; color: #666666; margin: 0 0 10px 0;">• Nunca compartilhe seu código de convite com outras pessoas.</p>
                  <p style="font-size: 13px; color: #666666; margin: 0 0 10px 0;">• A ABZ Group nunca solicitará sua senha por e-mail ou telefone.</p>
                  <p style="font-size: 13px; color: #666666; margin: 0;">• Em caso de dúvidas, entre em contato com o suporte.</p>
                </td>
              </tr>

              <!-- Rodapé -->
              <tr>
                <td style="padding: 20px 30px; text-align: center; background-color: #ffffff; border-top: 1px solid #e0e0e0;">
                  <p style="font-size: 12px; color: #999999; margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} ABZ Group. Todos os direitos reservados.</p>
                  <p style="font-size: 12px; color: #999999; margin: 0;">Este e-mail foi enviado para ${email}. Se você não solicitou este convite, por favor ignore esta mensagem ou entre em contato com nosso suporte.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Usar a função genérica para enviar o email
  try {
    const result = await sendEmail(email, 'Convite para o Painel ABZ Group', text, html);
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

// Função para gerar um código de verificação
export function generateVerificationCode(): string {
  // Gera um código de 6 dígitos
  return Math.floor(100000 + Math.random() * 900000).toString();
}
