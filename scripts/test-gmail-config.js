require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmailConfig() {
  console.log('Testando configuração de e-mail com Gmail...');
  console.log('Configurações atuais:');
  console.log('- EMAIL_HOST:', process.env.EMAIL_HOST || 'smtp.gmail.com');
  console.log('- EMAIL_PORT:', process.env.EMAIL_PORT || '465');
  console.log('- EMAIL_SECURE:', process.env.EMAIL_SECURE || 'true');
  console.log('- EMAIL_USER:', process.env.EMAIL_USER || 'apiabzgroup@gmail.com');
  console.log('- EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '******' : 'não definido');
  console.log('- EMAIL_SERVER:', process.env.EMAIL_SERVER ? process.env.EMAIL_SERVER.replace(/:[^:]*@/, ':****@') : 'não definido');

  try {
    // Verificar se temos configuração de e-mail
    if (!process.env.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD === 'senha_do_app') {
      console.error('\nErro: Senha de aplicativo do Gmail não configurada!');
      console.error('Por favor, substitua "senha_do_app" pela senha de aplicativo real no arquivo .env');
      return {
        success: false,
        message: 'Senha de aplicativo do Gmail não configurada'
      };
    }

    // Configuração otimizada para Gmail
    const gmailConfig = {
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

    console.log('\nTentando criar transporter com Gmail...');
    const transporter = nodemailer.createTransport(gmailConfig);
    
    console.log('Verificando conexão com o servidor SMTP...');
    await transporter.verify();
    console.log('Conexão com o servidor SMTP verificada com sucesso!');
    
    // Perguntar se deseja enviar um e-mail de teste
    const testEmail = process.argv[2];
    if (testEmail) {
      console.log(`\nEnviando e-mail de teste para ${testEmail}...`);
      
      // Preparar opções do e-mail com cabeçalhos anti-spam
      const mailOptions = {
        from: `"ABZ Group" <${process.env.EMAIL_USER}>`,
        to: testEmail,
        subject: 'Teste de Configuração de E-mail - ABZ Group',
        text: 'Este é um e-mail de teste para verificar a configuração do sistema de e-mail.',
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
                        <img src="https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png" alt="ABZ Group Logo" width="200" style="display: block; max-width: 200px; height: auto;">
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 0 20px 20px 20px;">
                        <h1 style="color: #0066cc; font-size: 24px; margin: 0;">Teste de E-mail</h1>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 0 20px 20px 20px;">
                        <p style="margin: 0 0 20px 0; text-align: center;">Este é um e-mail de teste para verificar a configuração do sistema de e-mail.</p>
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
          'X-Sender': process.env.EMAIL_USER,
          // Opção de descadastramento (importante para evitar spam)
          'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER}?subject=Unsubscribe>`,
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
    }
    
    return {
      success: true,
      message: 'Configuração de e-mail com Gmail verificada com sucesso',
      config: {
        host: gmailConfig.host,
        port: gmailConfig.port,
        secure: gmailConfig.secure,
        user: gmailConfig.auth.user
      }
    };
  } catch (error) {
    console.error('\nErro ao testar configuração de e-mail com Gmail:', error);
    console.error('Detalhes do erro:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.error('\nErro de autenticação! Verifique se:');
      console.error('1. A senha de aplicativo está correta');
      console.error('2. A verificação em duas etapas está ativada na conta Google');
      console.error('3. A senha de aplicativo foi gerada corretamente');
    }
    
    if (error.message.includes('Username and Password not accepted')) {
      console.error('\nUsuário e senha não aceitos! Verifique se:');
      console.error('1. Você está usando uma senha de aplicativo (não a senha normal da conta)');
      console.error('2. A conta não tem restrições de segurança adicionais');
    }
    
    return {
      success: false,
      message: 'Erro ao testar configuração de e-mail com Gmail',
      error: error.message
    };
  }
}

// Executar o teste
testGmailConfig()
  .then(result => {
    console.log('\nResultado do teste:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\nA configuração de e-mail com Gmail está funcionando corretamente!');
      console.log('Você pode usar esta configuração para enviar e-mails de verificação e notificações.');
    } else {
      console.log('\nA configuração de e-mail com Gmail não está funcionando corretamente.');
      console.log('Por favor, verifique as instruções acima para resolver o problema.');
    }
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
  });
