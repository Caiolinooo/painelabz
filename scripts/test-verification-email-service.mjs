import dotenv from 'dotenv';
import { sendVerificationEmail } from '../src/lib/email-service.js';

// Carregar variáveis de ambiente
dotenv.config();

async function testVerificationEmail() {
  const testEmail = process.argv[2] || 'test@example.com';
  const testCode = '123456';
  
  console.log(`Enviando email de verificação para ${testEmail} com código ${testCode}...`);
  
  try {
    const result = await sendVerificationEmail(testEmail, testCode);
    
    console.log('Resultado:', result);
    
    if (result.success) {
      console.log('Email enviado com sucesso!');
      if (result.previewUrl) {
        console.log('URL de preview:', result.previewUrl);
      }
    } else {
      console.error('Falha ao enviar email:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

testVerificationEmail()
  .then(result => {
    console.log('Teste concluído.');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro no teste:', error);
    process.exit(1);
  });
