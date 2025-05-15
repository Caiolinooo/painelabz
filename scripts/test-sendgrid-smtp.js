require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSendgridSmtp() {
  console.log('Testando configuração SMTP do SendGrid...');
  
  // Verificar se temos a chave do SendGrid
  const sendgridApiKey = process.env.SENDGRID_API_KEY || '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';
  
  console.log('Configurações atuais:');
  console.log('- SENDGRID_API_KEY:', sendgridApiKey ? '********' : 'não definido');
  
  // Obter o email de teste
  const testEmail = process.argv[2];
  if (!testEmail) {
    console.error('Por favor, forneça um email de teste como argumento.');
    console.error('Exemplo: node scripts/test-sendgrid-smtp.js seu-email@exemplo.com');
    return {
      success: false,
      message: 'Email de teste não fornecido'
    };
  }
  
  try {
    console.log(`\nTestando envio via SMTP do SendGrid para ${testEmail}...`);
    
    // Criar um código de verificação de teste
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Configuração do nodemailer com SendGrid
    const sendgridConfig = {
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey', // Sempre 'apikey' para SendGrid
        pass: sendgridApiKey
      }
    };
    
    // Criar transporter
    const transporter = nodemailer.createTransport(sendgridConfig);
    
    // Verificar conexão
    await transporter.verify();
    console.log('Conexão com o SMTP do SendGrid verificada com sucesso!');
    
    // Enviar email de teste
    const info = await transporter.sendMail({
      from: 'caio.correia@groupabz.com', // Usar o mesmo email do destinatário para testes
      to: testEmail,
      subject: 'Teste de SMTP do SendGrid - ABZ Group',
      text: `Seu código de verificação de teste é: ${testCode}. Este é um email de teste para verificar a configuração SMTP do SendGrid.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0066cc; text-align: center;">Teste do SMTP do SendGrid</h2>
          <p style="margin-bottom: 20px; text-align: center;">
            Este é um email de teste para verificar a configuração SMTP do SendGrid.
          </p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
            ${testCode}
          </div>
          <p style="text-align: center;">
            Se você recebeu este email, a configuração SMTP do SendGrid está funcionando corretamente.
          </p>
          <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            <p>ABZ Group</p>
            <p><a href="https://abzgroup.com.br">https://abzgroup.com.br</a></p>
            <p>${new Date().getFullYear()} &copy; Todos os direitos reservados.</p>
          </div>
        </div>
      `
    });
    
    console.log('Email enviado com sucesso via SMTP do SendGrid!');
    console.log('ID da mensagem:', info.messageId);
    
    return {
      success: true,
      message: 'Configuração SMTP do SendGrid testada com sucesso',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Erro ao testar SMTP do SendGrid:', error);
    
    return {
      success: false,
      message: `Erro ao testar SMTP do SendGrid: ${error.message}`,
      error: error
    };
  }
}

// Executar o teste
testSendgridSmtp()
  .then(result => {
    console.log('\nResultado do teste:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\nSMTP do SendGrid configurado com sucesso!');
      console.log('Verifique sua caixa de entrada para confirmar o recebimento do email de teste.');
    } else {
      console.error('\nFalha na configuração SMTP do SendGrid.');
      console.error('Verifique as mensagens de erro acima e tente novamente.');
    }
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
  });
