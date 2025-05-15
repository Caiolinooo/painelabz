require('dotenv').config();
const { createTransport, sendEmail, sendVerificationEmail, testConnection } = require('../src/lib/email-service');

async function testNewEmail() {
  console.log('Testando novo serviço de e-mail...');
  
  try {
    // Testar conexão
    console.log('Testando conexão...');
    const connectionResult = await testConnection();
    console.log('Resultado do teste de conexão:', connectionResult);
    
    if (!connectionResult.success) {
      console.error('Falha na conexão com o servidor SMTP');
      return connectionResult;
    }
    
    // Testar envio de e-mail
    const testEmail = process.argv[2] || 'test@example.com';
    console.log(`Enviando e-mail de teste para ${testEmail}...`);
    
    const emailResult = await sendEmail(
      testEmail,
      'Teste de E-mail - ABZ Group',
      'Este é um e-mail de teste.',
      '<b>Este é um e-mail de teste.</b>'
    );
    
    console.log('Resultado do envio de e-mail:', emailResult);
    
    // Testar envio de código de verificação
    console.log(`Enviando código de verificação para ${testEmail}...`);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    const verificationResult = await sendVerificationEmail(testEmail, code);
    console.log('Resultado do envio de código de verificação:', verificationResult);
    
    return {
      success: true,
      connectionResult,
      emailResult,
      verificationResult
    };
  } catch (error) {
    console.error('Erro ao testar serviço de e-mail:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar o teste
testNewEmail()
  .then(result => {
    console.log('Teste concluído.');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro no teste:', error);
    process.exit(1);
  });
