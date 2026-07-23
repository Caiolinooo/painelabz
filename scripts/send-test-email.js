require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendTestEmail() {
  const testEmail = process.argv[2] || 'test@example.com';
  const testCode = '123456';
  
  console.log(`Enviando email de teste para ${testEmail}...`);
  
  try {
    // Criar conta de teste Ethereal
    console.log('Criando conta de teste Ethereal...');
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('Conta criada:', {
      user: testAccount.user,
      pass: testAccount.pass
    });
    
    // Criar transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    // Verificar conexão
    await transporter.verify();
    console.log('Conexão verificada com sucesso!');
    
    // Enviar email
    const info = await transporter.sendMail({
      from: '"ABZ Group" <no-reply@abzgroup.com>',
      to: testEmail,
      subject: 'Código de Verificação - ABZ Group',
      text: `Seu código de verificação é: ${testCode}. Este código expira em 10 minutos.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0066cc; text-align: center;">Seu Código de Verificação</h2>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
            ${testCode}
          </div>
          <p style="margin-bottom: 20px; text-align: center;">Este código expira em <strong>10 minutos</strong>.</p>
          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
            Se você não solicitou este código, por favor ignore este email.
          </p>
        </div>
      `
    });
    
    console.log('Email enviado com sucesso!');
    console.log('ID da mensagem:', info.messageId);
    
    // Obter URL de preview
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('URL de preview:', previewUrl);
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl
    };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

sendTestEmail()
  .then(result => {
    console.log('Teste concluído.');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro no teste:', error);
    process.exit(1);
  });
