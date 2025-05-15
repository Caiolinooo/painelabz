require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendVerificationEmail(email, code) {
  console.log(`Enviando código de verificação ${code} para ${email}...`);
  
  // Configuração do Gmail
  const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'apiabzgroup@gmail.com',
      pass: process.env.EMAIL_PASSWORD
    },
    // Configurações para melhorar a entregabilidade
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Configurações de timeout
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // Desativar verificação de certificado em ambiente de desenvolvimento
    tls: {
      rejectUnauthorized: false
    }
  };
  
  try {
    // Criar transporter
    const transporter = nodemailer.createTransport(config);
    
    // Verificar conexão
    await transporter.verify();
    console.log('Conexão verificada com sucesso!');
    
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
                    <img src="https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png" alt="ABZ Group Logo" width="200" style="display: block; max-width: 200px; height: auto;">
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
    
    // Preparar opções do e-mail com cabeçalhos anti-spam
    const mailOptions = {
      from: `"ABZ Group" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Código de Verificação - ABZ Group',
      text,
      html,
      // Cabeçalhos para melhorar a entregabilidade e evitar spam
      headers: {
        // Prioridade do email
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        // Identificação do remetente
        'X-Mailer': 'ABZ Group Mailer',
        'X-Sender': process.env.EMAIL_USER,
        // Opção de descadastramento (importante para evitar spam)
        'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER}?subject=Unsubscribe>`,
        // Identificação da mensagem
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substring(2)}@abzgroup.com>`,
        // Feedback loop
        'Feedback-ID': `${Date.now()}:abzgroup:verification`
      },
      // Configurações adicionais
      encoding: 'utf-8',
      priority: 'high',
      disableFileAccess: true,
      disableUrlAccess: true
    };
    
    // Enviar email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email enviado com sucesso!');
    console.log('ID da mensagem:', info.messageId);
    console.log('Resposta do servidor:', info.response);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    console.error('Detalhes do erro:', error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Gerar código de verificação
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Executar o teste
const testEmail = process.argv[2] || 'test@example.com';
const testCode = generateVerificationCode();

sendVerificationEmail(testEmail, testCode)
  .then(result => {
    console.log('Resultado do teste:', result);
    if (result.success) {
      console.log(`\nCódigo de verificação ${testCode} enviado com sucesso para ${testEmail}`);
      console.log('Verifique sua caixa de entrada (e a pasta de spam, por precaução).');
    } else {
      console.log('\nFalha ao enviar código de verificação.');
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro no teste:', error);
    process.exit(1);
  });
