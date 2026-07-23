require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testando envio de e-mail com Ethereal...');
  
  // Criar transportador com Ethereal
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'c2z6ej7cai5vpdol@ethereal.email',
      pass: 'HxRMTY73284bqa3DWG'
    }
  });
  
  try {
    // Verificar conexão
    await transporter.verify();
    console.log('Conexão com o servidor SMTP verificada com sucesso!');
    
    // Enviar e-mail
    const info = await transporter.sendMail({
      from: '"ABZ Group" <c2z6ej7cai5vpdol@ethereal.email>',
      to: 'test@example.com',
      subject: 'Teste de E-mail',
      text: 'Este é um e-mail de teste.',
      html: '<b>Este é um e-mail de teste.</b>'
    });
    
    console.log('E-mail enviado com sucesso!');
    console.log('ID da mensagem:', info.messageId);
    console.log('URL de visualização:', nodemailer.getTestMessageUrl(info));
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

testEmail()
  .then(result => {
    console.log('Resultado:', result);
  })
  .catch(error => {
    console.error('Erro:', error);
  });
