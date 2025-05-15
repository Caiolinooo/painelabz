require('dotenv').config();
const { sendPasswordSetupEmail } = require('../dist/lib/email-sendgrid');

async function testPasswordSetupEmail() {
  console.log('Testando envio de e-mail com código de verificação...');

  // Obter o email de teste
  const testEmail = process.argv[2];
  if (!testEmail) {
    console.error('Por favor, forneça um email de teste como argumento.');
    console.error('Exemplo: node scripts/test-password-setup-email.js seu-email@exemplo.com');
    return {
      success: false,
      message: 'Email de teste não fornecido'
    };
  }

  // Obter o tipo de e-mail (novo usuário ou redefinição)
  const isNewUser = process.argv[3] === 'new';

  // Gerar um código de verificação (6 dígitos)
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    console.log(`\nEnviando e-mail com código de verificação para ${testEmail}...`);
    console.log(`Tipo: ${isNewUser ? 'Novo usuário' : 'Redefinição de senha'}`);

    // Enviar e-mail
    const result = await sendPasswordSetupEmail(testEmail, verificationCode, isNewUser);

    console.log('E-mail enviado com sucesso!');

    return {
      success: true,
      message: `E-mail com código de verificação enviado com sucesso`,
      code: verificationCode,
      result
    };
  } catch (error) {
    console.error(`Erro ao enviar e-mail com código de verificação:`, error);

    return {
      success: false,
      message: `Erro ao enviar e-mail com código de verificação: ${error.message}`,
      error
    };
  }
}

// Executar o teste
testPasswordSetupEmail()
  .then(result => {
    console.log('\nResultado do teste:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\nE-mail enviado com sucesso!');
      console.log('Verifique sua caixa de entrada para confirmar o recebimento do e-mail.');
      console.log('\nCódigo de verificação gerado:', result.code);
      console.log('Este código deve ser inserido pelo usuário no site para definir/redefinir a senha.');
    } else {
      console.error('\nFalha ao enviar e-mail.');
      console.error('Verifique as mensagens de erro acima e tente novamente.');
    }
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
  });
