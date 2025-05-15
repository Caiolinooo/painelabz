require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEtherealEmail() {
  console.log('Testando envio de e-mail com Ethereal...');
  
  // Obter configurações do arquivo .env
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT);
  const secure = process.env.EMAIL_SECURE === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  
  console.log('Configuração carregada:', {
    host,
    port,
    secure,
    user,
    // Não mostrar a senha
  });
  
  try {
    // Criar transporter com configuração do Ethereal
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });
    
    console.log('Transporter criado, verificando conexão...');
    
    // Verificar conexão
    await transporter.verify();
    
    console.log('Conexão com o servidor Ethereal verificada com sucesso!');
    
    // Enviar e-mail de teste
    console.log('Enviando e-mail de teste...');
    
    const info = await transporter.sendMail({
      from: '"ABZ Group" <apiabz@groupabz.com>',
      to: 'test@example.com',
      subject: 'Teste de E-mail',
      text: 'Este é um e-mail de teste.',
      html: '<b>Este é um e-mail de teste.</b>'
    });
    
    console.log('E-mail enviado com sucesso!');
    console.log('ID da mensagem:', info.messageId);
    
    // Obter URL de preview
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('URL de preview:', previewUrl);
    
    return {
      success: true,
      message: 'E-mail enviado com sucesso!',
      messageId: info.messageId,
      previewUrl
    };
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    console.error('Detalhes do erro:', error.message);
    
    return {
      success: false,
      message: `Erro ao enviar e-mail: ${error.message}`,
      error
    };
  }
}

// Executar o teste
testEtherealEmail()
  .then(result => {
    console.log('Resultado do teste:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
    process.exit(1);
  });
