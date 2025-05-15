require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfig() {
  console.log('Testando configuração de e-mail...');
  console.log('Configurações atuais:');
  console.log('- EMAIL_HOST:', process.env.EMAIL_HOST || 'outlook.office365.com');
  console.log('- EMAIL_PORT:', process.env.EMAIL_PORT || '587');
  console.log('- EMAIL_SECURE:', process.env.EMAIL_SECURE || 'false');
  console.log('- EMAIL_USER:', process.env.EMAIL_USER || 'apiabz@groupabz.com');
  console.log('- EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '******' : 'não definido');

  // Configuração do Exchange com OAuth2 (recomendado para Microsoft 365)
  const exchangeConfig = {
    host: process.env.EMAIL_HOST || 'outlook.office365.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'apiabz@groupabz.com',
      pass: process.env.EMAIL_PASSWORD || 'Caio@2122@'
    },
    tls: {
      rejectUnauthorized: false, // Aceitar certificados auto-assinados
      ciphers: 'SSLv3'
    }
  };

  try {
    console.log('Tentando criar transporter com configuração manual...');
    const transporter = nodemailer.createTransport(exchangeConfig);
    
    console.log('Verificando conexão com o servidor SMTP...');
    await transporter.verify();
    console.log('Conexão com o servidor SMTP verificada com sucesso!');
    
    // Tentar enviar um e-mail de teste
    console.log('Enviando e-mail de teste...');
    const info = await transporter.sendMail({
      from: `"ABZ Group" <${process.env.EMAIL_USER || 'apiabz@groupabz.com'}>`,
      to: process.env.EMAIL_USER || 'apiabz@groupabz.com', // Enviar para o próprio e-mail
      subject: 'Teste de Configuração de E-mail',
      text: 'Este é um e-mail de teste para verificar a configuração do sistema de e-mail.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0066cc; text-align: center;">Teste de E-mail</h2>
          <p style="margin-bottom: 20px; text-align: center;">
            Este é um e-mail de teste para verificar a configuração do sistema de e-mail.
          </p>
          <p style="margin-bottom: 20px; text-align: center;">Data e hora do envio: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      `
    });
    
    console.log('E-mail enviado com sucesso!');
    console.log('ID da mensagem:', info.messageId);
    
    return {
      success: true,
      message: 'Configuração de e-mail verificada com sucesso',
      config: {
        host: exchangeConfig.host,
        port: exchangeConfig.port,
        secure: exchangeConfig.secure,
        user: exchangeConfig.auth.user
      }
    };
  } catch (error) {
    console.error('Erro ao testar configuração de e-mail:', error);
    
    // Tentar com configuração alternativa
    console.log('\nTentando configuração alternativa...');
    
    // Configuração alternativa usando Gmail
    const gmailConfig = {
      service: 'gmail',
      auth: {
        user: 'apiabzgroup@gmail.com', // Use uma conta Gmail alternativa
        pass: 'sua-senha-de-app-do-gmail' // Use uma senha de aplicativo
      }
    };
    
    try {
      console.log('Criando transporter com Gmail...');
      const gmailTransporter = nodemailer.createTransport(gmailConfig);
      
      console.log('Verificando conexão com o Gmail...');
      await gmailTransporter.verify();
      console.log('Conexão com o Gmail verificada com sucesso!');
      
      console.log('Recomendação: Configure uma conta Gmail com senha de aplicativo para envio de e-mails.');
      console.log('Instruções:');
      console.log('1. Crie uma conta Gmail');
      console.log('2. Ative a verificação em duas etapas');
      console.log('3. Gere uma senha de aplicativo em https://myaccount.google.com/apppasswords');
      console.log('4. Use essa senha no arquivo .env');
      
      return {
        success: false,
        message: 'Erro na configuração principal, mas Gmail pode ser uma alternativa',
        error: error.message,
        recommendation: 'Use Gmail com senha de aplicativo'
      };
    } catch (gmailError) {
      console.error('Erro também com Gmail:', gmailError);
      
      // Tentar com Ethereal (para testes)
      try {
        console.log('\nCriando conta de teste Ethereal...');
        const testAccount = await nodemailer.createTestAccount();
        
        const etherealConfig = {
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        };
        
        const etherealTransporter = nodemailer.createTransport(etherealConfig);
        await etherealTransporter.verify();
        
        console.log('Conta de teste Ethereal criada com sucesso!');
        console.log('Credenciais:');
        console.log('- User:', testAccount.user);
        console.log('- Pass:', testAccount.pass);
        
        return {
          success: false,
          message: 'Configurações principais falharam, mas Ethereal funciona para testes',
          etherealAccount: {
            user: testAccount.user,
            pass: testAccount.pass
          },
          recommendation: 'Use Ethereal para testes ou configure um serviço de e-mail como SendGrid, Mailgun ou Gmail'
        };
      } catch (etherealError) {
        console.error('Erro com todas as configurações:', etherealError);
        
        return {
          success: false,
          message: 'Todas as configurações de e-mail falharam',
          error: error.message,
          gmailError: gmailError.message,
          etherealError: etherealError.message,
          recommendation: 'Configure um serviço de e-mail como SendGrid ou Mailgun'
        };
      }
    }
  }
}

// Executar o teste
testEmailConfig()
  .then(result => {
    console.log('\nResultado do teste:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\nSugestão para o arquivo .env:');
      console.log(`EMAIL_HOST=${result.config.host}`);
      console.log(`EMAIL_PORT=${result.config.port}`);
      console.log(`EMAIL_SECURE=${result.config.secure}`);
      console.log(`EMAIL_USER=${result.config.user}`);
      console.log('EMAIL_PASSWORD=sua-senha');
    } else if (result.etherealAccount) {
      console.log('\nPara testes, você pode usar Ethereal:');
      console.log(`EMAIL_HOST=smtp.ethereal.email`);
      console.log(`EMAIL_PORT=587`);
      console.log(`EMAIL_SECURE=false`);
      console.log(`EMAIL_USER=${result.etherealAccount.user}`);
      console.log(`EMAIL_PASSWORD=${result.etherealAccount.pass}`);
    }
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
  });
