require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEtherealEmail() {
  console.log('Testando envio de e-mail com Ethereal (para testes)...');
  
  // Obter o email de teste
  const testEmail = process.argv[2];
  if (!testEmail) {
    console.error('Por favor, forneça um email de teste como argumento.');
    console.error('Exemplo: node scripts/test-ethereal.js seu-email@exemplo.com');
    return {
      success: false,
      message: 'Email de teste não fornecido'
    };
  }
  
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
    
    // Criar um código de verificação de teste
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Enviar email
    const info = await transporter.sendMail({
      from: '"ABZ Group" <no-reply@abzgroup.com.br>',
      to: testEmail,
      subject: 'Código de Verificação - ABZ Group',
      text: `Seu código de verificação é: ${testCode}. Este código expira em 10 minutos.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0066cc; text-align: center;">Seu Código de Verificação</h2>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
            ${testCode}
          </div>
          <p style="text-align: center;">
            Este código expira em <strong>10 minutos</strong>.
          </p>
          <p style="text-align: center;">
            Se você não solicitou este código, por favor ignore este email.
          </p>
          <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            <p>ABZ Group</p>
            <p><a href="https://abzgroup.com.br">https://abzgroup.com.br</a></p>
            <p>${new Date().getFullYear()} &copy; Todos os direitos reservados.</p>
          </div>
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
      message: 'Email enviado com sucesso',
      messageId: info.messageId,
      previewUrl: previewUrl,
      etherealAccount: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    
    return {
      success: false,
      message: `Erro ao enviar email: ${error.message}`,
      error: error
    };
  }
}

// Executar o teste
testEtherealEmail()
  .then(result => {
    console.log('\nResultado do teste:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\nEmail enviado com sucesso!');
      console.log('Para visualizar o email, acesse a URL de preview:');
      console.log(result.previewUrl);
      console.log('\nCredenciais da conta Ethereal:');
      console.log('- User:', result.etherealAccount.user);
      console.log('- Pass:', result.etherealAccount.pass);
      console.log('\nVocê pode usar essas credenciais para configurar o sistema para testes:');
      console.log('EMAIL_HOST=smtp.ethereal.email');
      console.log('EMAIL_PORT=587');
      console.log('EMAIL_SECURE=false');
      console.log(`EMAIL_USER=${result.etherealAccount.user}`);
      console.log(`EMAIL_PASSWORD=${result.etherealAccount.pass}`);
    } else {
      console.error('\nFalha ao enviar email.');
      console.error('Verifique as mensagens de erro acima e tente novamente.');
    }
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
  });
