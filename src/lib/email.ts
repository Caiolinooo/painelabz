import nodemailer from 'nodemailer';

// Configuração do transporte de email
// Usamos Gmail como serviço principal e Ethereal como fallback
let transporter: nodemailer.Transporter;
let fallbackTransporter: nodemailer.Transporter;

// Configuração do Gmail (principal)
const gmailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para outras portas
  auth: {
    user: process.env.EMAIL_USER || 'apiabzgroup@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'dvndfxjmnmzfzeth'
  },
  // Desativar verificação de certificado em ambiente de desenvolvimento
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  },
  // Usar STARTTLS para a porta 587
  requireTLS: true,
  // Configurar autenticação
  authMethod: 'PLAIN',
  debug: process.env.NODE_ENV !== 'production',
  logger: process.env.NODE_ENV !== 'production',
  // Melhorar a entregabilidade dos e-mails
  pool: true, // Usar conexões persistentes
  maxConnections: 5,
  maxMessages: 100,
  // Adicionar cabeçalhos para reduzir chances de spam
  headers: {
    'X-Priority': '1',
    'X-MSMail-Priority': 'High',
    'Importance': 'High'
  }
};

// Log para debug
console.log('Configuração de email carregada:', {
  host: gmailConfig.host,
  port: gmailConfig.port,
  secure: gmailConfig.secure,
  user: gmailConfig.auth.user,
  // Não logar a senha por segurança
});

// Configuração do Ethereal Mail (fallback)
const etherealConfig = {
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false, // true para 465, false para outras portas
  auth: {
    user: 'herman.satterfield@ethereal.email',
    pass: 'JbshBkaA6822jjc7dv'
  }
};

// Inicializa o transporte de email
export async function initEmailTransport() {
  // Se já temos um transporter, retorna
  if (transporter) return transporter;

  try {
    // Configuração principal (Gmail)
    console.log('Inicializando transporte de email principal (Gmail)');

    // Tentar usar a string de conexão diretamente primeiro
    if (process.env.EMAIL_SERVER) {
      console.log('Usando string de conexão EMAIL_SERVER');
      try {
        transporter = nodemailer.createTransport(process.env.EMAIL_SERVER);
        console.log('Transporter criado com string de conexão');
      } catch (connError) {
        console.error('Erro ao criar transporter com string de conexão:', connError);
        console.log('Tentando usar configuração manual...');

        // Se falhar, usar a configuração manual
        console.log('Usando configuração manual:', {
          host: gmailConfig.host,
          port: gmailConfig.port,
          secure: gmailConfig.secure,
          user: gmailConfig.auth.user,
          // Não logar a senha completa por segurança
          pass: gmailConfig.auth.pass ? '****' : 'não definida'
        });

        transporter = nodemailer.createTransport(gmailConfig);
      }
    } else {
      // Se não tiver string de conexão, usar configuração manual
      console.log('EMAIL_SERVER não definido, usando configuração manual:', {
        host: gmailConfig.host,
        port: gmailConfig.port,
        secure: gmailConfig.secure,
        user: gmailConfig.auth.user,
        // Não logar a senha completa por segurança
        pass: gmailConfig.auth.pass ? '****' : 'não definida'
      });

      transporter = nodemailer.createTransport(gmailConfig);
    }

    // Verificar conexão
    console.log('Verificando conexão com o servidor SMTP...');
    await transporter.verify();
    console.log('Transporte de email principal inicializado com sucesso');
    console.log('Conexão com o servidor SMTP verificada com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar transporte de email principal:', error);
    console.error('Detalhes do erro:', error instanceof Error ? error.message : 'Erro desconhecido');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    transporter = null;
  }

  // Inicializar fallback (Ethereal)
  try {
    console.log('Inicializando transporte de email fallback (Ethereal)');
    fallbackTransporter = nodemailer.createTransport(etherealConfig);

    // Verificar conexão
    await fallbackTransporter.verify();
    console.log('Transporte de email fallback inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar transporte de email fallback:', error);

    // Se o fallback falhar, tentar criar uma conta de teste Ethereal
    try {
      console.log('Tentando criar conta de teste Ethereal...');
      const testAccount = await nodemailer.createTestAccount();

      fallbackTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('Conta de teste Ethereal criada com sucesso:', {
        user: testAccount.user,
        pass: testAccount.pass,
        previewURL: `https://ethereal.email/message/`,
      });
    } catch (testError) {
      console.error('Erro ao criar conta de teste Ethereal:', testError);
      fallbackTransporter = null;
    }
  }

  // Retornar o transporter principal ou o fallback
  return transporter || fallbackTransporter;
}

// Função para gerar um código de verificação
export function generateVerificationCode(): string {
  // Gera um código de 6 dígitos
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Função genérica para enviar emails
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
): Promise<{ success: boolean; message: string; previewUrl?: string; usedFallback?: boolean }> {
  // Conteúdo do email
  const mailOptions = {
    from: options?.from || process.env.EMAIL_FROM || '"ABZ Group" <apiabzgroup@gmail.com>',
    to,
    cc: options?.cc,
    bcc: options?.bcc,
    subject,
    text,
    html,
    attachments: options?.attachments,
    // Adicionar cabeçalhos para melhorar a entregabilidade
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
      'X-Mailer': 'ABZ Group Mailer',
      'List-Unsubscribe': '<mailto:apiabzgroup@gmail.com?subject=Unsubscribe>'
    },
    // Adicionar informações de prioridade
    priority: 'high',
  };

  console.log('Enviando email para:', Array.isArray(to) ? to.join(', ') : to);
  console.log('Assunto:', subject);

  // Tentar enviar com o transporte principal
  try {
    // Inicializa o transporte se ainda não foi inicializado
    await initEmailTransport();

    // Verificar se temos um transporter principal
    if (transporter) {
      console.log('Tentando enviar email com transporte principal...');
      console.log('Detalhes do email:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        hasAttachments: mailOptions.attachments ? 'Sim' : 'Não'
      });

      const info = await transporter.sendMail(mailOptions);
      console.log('Email enviado com sucesso. ID da mensagem:', info.messageId);

      // Se estamos usando Ethereal, retorna a URL de preview
      let previewUrl;
      if (process.env.NODE_ENV !== 'production' && info.messageId) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('URL de preview do email (transporte principal):', previewUrl);
      }

      console.log('Email enviado com sucesso usando transporte principal');
      return {
        success: true,
        message: 'Email enviado com sucesso',
        previewUrl,
        usedFallback: false
      };
    } else {
      console.log('Transporter principal não está disponível, usando fallback...');
    }
  } catch (error) {
    console.error('Erro ao enviar email com transporte principal:', error);
    console.error('Detalhes do erro:', error instanceof Error ? error.message : 'Erro desconhecido');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    console.log('Tentando usar fallback...');
    // Continuar para o fallback
  }

  // Tentar enviar com o transporte fallback
  try {
    if (fallbackTransporter) {
      console.log('Tentando enviar email com transporte fallback (Ethereal)...');
      const info = await fallbackTransporter.sendMail(mailOptions);

      // Ethereal sempre fornece uma URL de preview
      let previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('URL de preview do email (transporte fallback):', previewUrl);

      console.log('Email enviado com sucesso usando transporte fallback');
      return {
        success: true,
        message: 'Email enviado com sucesso (usando fallback)',
        previewUrl,
        usedFallback: true
      };
    }
  } catch (fallbackError) {
    console.error('Erro ao enviar email com transporte fallback:', fallbackError);
  }

  // Se chegamos aqui, ambos os métodos falharam
  return {
    success: false,
    message: 'Erro ao enviar email (ambos os métodos falharam)',
  };
}

// Função para enviar um email com código de verificação
export async function sendVerificationEmail(
  email: string,
  code: string
): Promise<{ success: boolean; message: string; previewUrl?: string; usedFallback?: boolean }> {
  const text = `Seu código de verificação é: ${code}. Este código expira em 10 minutos.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png" alt="ABZ Group Logo" style="max-width: 200px;">
      </div>
      <h2 style="color: #0066cc; text-align: center;">Seu Código de Verificação</h2>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
        ${code}
      </div>
      <p style="margin-bottom: 20px; text-align: center;">Este código expira em <strong>10 minutos</strong>.</p>
      <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
        Se você não solicitou este código, por favor ignore este email.
      </p>
      <div style="border-top: 1px solid #e0e0e0; margin-top: 20px; padding-top: 20px; text-align: center; font-size: 12px; color: #999;">
        &copy; ${new Date().getFullYear()} ABZ Group. Todos os direitos reservados.
      </div>
    </div>
  `;

  // Usar a função genérica para enviar o email
  const result = await sendEmail(email, 'Código de Verificação - ABZ Group', text, html);

  // Personalizar a mensagem de sucesso
  if (result.success) {
    result.message = result.usedFallback
      ? 'Email de verificação enviado com sucesso (usando fallback)'
      : 'Email de verificação enviado com sucesso';
  } else {
    result.message = 'Erro ao enviar email de verificação';
  }

  return result;
}

// Função para enviar um email de convite para novos usuários
export async function sendInvitationEmail(
  email: string,
  inviteCode: string,
  name?: string
): Promise<{ success: boolean; message: string; previewUrl?: string; usedFallback?: boolean }> {
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
                  <img src="https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png" alt="ABZ Group Logo" style="max-width: 200px; height: auto;">
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
  const result = await sendEmail(email, 'Convite para o Painel ABZ Group', text, html);

  // Personalizar a mensagem de sucesso
  if (result.success) {
    result.message = result.usedFallback
      ? 'Email de convite enviado com sucesso (usando fallback)'
      : 'Email de convite enviado com sucesso';
  } else {
    result.message = 'Erro ao enviar email de convite';
  }

  return result;
}

/**
 * Função para testar a conexão com o servidor SMTP
 * @returns Resultado do teste
 */
export async function testEmailConnection() {
  try {
    console.log('Testando conexão com o servidor SMTP...');

    // Tentar inicializar o transporte
    const transport = await initEmailTransport();

    if (!transport) {
      console.error('Falha ao inicializar o transporte de email');
      return {
        success: false,
        message: 'Falha ao inicializar o transporte de email'
      };
    }

    // Verificar a conexão
    await transport.verify();

    console.log('Conexão com o servidor SMTP verificada com sucesso');
    return {
      success: true,
      message: 'Conexão com o servidor SMTP verificada com sucesso'
    };
  } catch (error) {
    console.error('Erro ao testar conexão com o servidor SMTP:', error);
    return {
      success: false,
      message: `Erro ao testar conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}