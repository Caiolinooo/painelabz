require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmailEmail() {
  console.log('Testando envio de e-mail com Gmail...');

  // Obter configurações do arquivo .env
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '465');
  const secure = process.env.EMAIL_SECURE === 'true';
  const user = process.env.EMAIL_USER || 'apiabzgroup@gmail.com';
  const pass = process.env.EMAIL_PASSWORD || 'senha_do_app';

  console.log('Configuração carregada:', {
    host,
    port,
    secure,
    user,
    // Não mostrar a senha
  });

  // Configuração otimizada para Gmail
  const config = {
    host,
    port,
    secure,
    auth: {
      user,
      pass
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
    console.log('Criando transporter...');
    const transporter = nodemailer.createTransport(config);

    // Verificar conexão
    console.log('Verificando conexão...');
    await transporter.verify();
    console.log('Conexão verificada com sucesso!');

    // Enviar e-mail
    const testEmail = process.argv[2] || 'test@example.com';
    console.log(`Enviando e-mail para ${testEmail}...`);

    // Preparar opções do e-mail com cabeçalhos anti-spam
    const mailOptions = {
      from: `"ABZ Group" <${user}>`,
      to: testEmail,
      subject: 'Teste de E-mail - ABZ Group',
      text: 'Este é um e-mail de teste.',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Teste de E-mail</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333; background-color: #f9f9f9;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9f9f9;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); max-width: 600px; margin: 0 auto;">
                  <tr>
                    <td align="center" style="padding: 30px 20px;">
                      <img src="${process.env.EMAIL_LOGO_URL || 'https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png'}" alt="ABZ Group Logo" width="200" style="display: block; max-width: 200px; height: auto;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0 20px 20px 20px;">
                      <h1 style="color: #0066cc; font-size: 24px; margin: 0;">Teste de E-mail</h1>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0 20px 20px 20px;">
                      <p style="margin: 0 0 20px 0; text-align: center;">Este é um e-mail de teste para verificar a configuração do Gmail.</p>
                      <p style="margin: 0; text-align: center; color: #666666; font-size: 14px;">Se você recebeu este e-mail, a configuração está funcionando corretamente.</p>
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
      `,
      // Cabeçalhos para melhorar a entregabilidade e evitar spam
      headers: {
        // Prioridade do email
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        // Identificação do remetente
        'X-Mailer': 'ABZ Group Mailer',
        'X-Sender': user,
        // Opção de descadastramento (importante para evitar spam)
        'List-Unsubscribe': `<mailto:${user}?subject=Unsubscribe>`,
        // Identificação da mensagem
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substring(2)}@abzgroup.com>`,
        // Feedback loop
        'Feedback-ID': `${Date.now()}:abzgroup:test`
      },
      // Configurações adicionais
      encoding: 'utf-8',
      priority: 'high',
      disableFileAccess: true,
      disableUrlAccess: true
    };

    // Enviar email
    const info = await transporter.sendMail(mailOptions);

    console.log('E-mail enviado com sucesso!');
    console.log('ID da mensagem:', info.messageId);
    console.log('Resposta do servidor:', info.response);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    console.error('Detalhes do erro:', error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

// Executar o teste
testGmailEmail()
  .then(result => {
    console.log('Resultado do teste:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro no teste:', error);
    process.exit(1);
  });
