require('dotenv').config();
const nodemailer = require('nodemailer');

async function testExchangeEmail() {
  console.log('Testando envio de e-mail com Exchange (api@groupabz.com)...');
  
  // Configuração do Exchange
  const config = {
    host: 'outlook.office365.com',
    port: 587,
    secure: false,
    auth: {
      user: 'api@groupabz.com',
      pass: 'Caio@2122@'
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  
  console.log('Configuração:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user
  });
  
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
    
    const info = await transporter.sendMail({
      from: '"ABZ Group" <api@groupabz.com>',
      to: testEmail,
      subject: 'Teste de E-mail - ABZ Group',
      text: 'Este é um e-mail de teste.',
      html: '<b>Este é um e-mail de teste.</b>'
    });
    
    console.log('E-mail enviado com sucesso!');
    console.log('ID da mensagem:', info.messageId);
    
    // Tentar obter URL de preview (pode não estar disponível para Exchange)
    try {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('URL de preview:', previewUrl);
      }
    } catch (previewError) {
      console.log('URL de preview não disponível (normal para Exchange)');
    }
    
    return {
      success: true,
      messageId: info.messageId
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
testExchangeEmail()
  .then(result => {
    console.log('Resultado do teste:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro no teste:', error);
    process.exit(1);
  });
