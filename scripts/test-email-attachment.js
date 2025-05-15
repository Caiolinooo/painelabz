require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sendEmailWithAttachment } = require('../dist/lib/email-sendgrid');

async function testEmailWithAttachment() {
  console.log('Testando envio de e-mail com anexo...');
  
  // Obter o email de teste
  const testEmail = process.argv[2];
  if (!testEmail) {
    console.error('Por favor, forneça um email de teste como argumento.');
    console.error('Exemplo: node scripts/test-email-attachment.js seu-email@exemplo.com');
    return {
      success: false,
      message: 'Email de teste não fornecido'
    };
  }
  
  // Criar um arquivo de teste para anexar
  const testFilePath = path.join(__dirname, 'test-attachment.txt');
  fs.writeFileSync(testFilePath, 'Este é um arquivo de teste para anexo de e-mail.');
  
  try {
    console.log(`\nEnviando e-mail com anexo para ${testEmail}...`);
    
    // Conteúdo do e-mail
    const subject = 'Teste de Anexo - ABZ Group';
    const text = 'Este é um e-mail de teste para verificar o envio de anexos.';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #0066cc; text-align: center;">Teste de Anexo</h2>
        <p style="margin-bottom: 20px; text-align: center;">
          Este é um e-mail de teste para verificar o envio de anexos.
        </p>
        <p style="text-align: center;">
          Verifique se o arquivo anexado foi recebido corretamente.
        </p>
        <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          <p>ABZ Group</p>
          <p><a href="https://groupabz.com">https://groupabz.com</a></p>
          <p>${new Date().getFullYear()} &copy; Todos os direitos reservados.</p>
        </div>
      </div>
    `;
    
    // Anexos
    const attachments = [
      {
        filename: 'test-attachment.txt',
        path: testFilePath
      }
    ];
    
    // Enviar e-mail
    const result = await sendEmailWithAttachment(testEmail, subject, text, html, attachments);
    
    console.log('E-mail enviado com sucesso!');
    
    // Limpar arquivo temporário
    fs.unlinkSync(testFilePath);
    
    return {
      success: true,
      message: 'E-mail com anexo enviado com sucesso',
      result
    };
  } catch (error) {
    console.error('Erro ao enviar e-mail com anexo:', error);
    
    // Limpar arquivo temporário
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    
    return {
      success: false,
      message: `Erro ao enviar e-mail com anexo: ${error.message}`,
      error
    };
  }
}

// Executar o teste
testEmailWithAttachment()
  .then(result => {
    console.log('\nResultado do teste:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\nE-mail com anexo enviado com sucesso!');
      console.log('Verifique sua caixa de entrada para confirmar o recebimento do e-mail com anexo.');
    } else {
      console.error('\nFalha ao enviar e-mail com anexo.');
      console.error('Verifique as mensagens de erro acima e tente novamente.');
    }
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
  });
