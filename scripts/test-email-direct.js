/**
 * Script para testar o envio de email diretamente usando o módulo nodemailer
 * Este script envia um email com anexos diretamente, sem passar pelo sistema de reembolso
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Configuração do email
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE !== 'false',
  auth: {
    user: process.env.EMAIL_USER || 'apiabzgroup@gmail.com',
    pass: process.env.EMAIL_PASSWORD
  }
};

// Função para enviar email
async function sendTestEmail(to) {
  try {
    console.log('Configuração de email:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user
    });

    // Criar transporte
    const transporter = nodemailer.createTransport(emailConfig);

    // Verificar conexão
    await transporter.verify();
    console.log('Conexão com o servidor SMTP verificada com sucesso');

    // Criar diretório de teste se não existir
    const testDir = path.join(__dirname, 'test-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Criar arquivos de teste
    const pdfPath = path.join(testDir, 'test-form.pdf');
    const imagePath = path.join(testDir, 'test-receipt.jpg');
    const textPath = path.join(testDir, 'test-note.txt');

    // Criar arquivos de teste se não existirem
    if (!fs.existsSync(pdfPath)) {
      fs.writeFileSync(pdfPath, 'Este é um arquivo PDF de teste para simular o formulário.');
    }
    if (!fs.existsSync(imagePath)) {
      fs.writeFileSync(imagePath, 'Este é um arquivo de imagem de teste para simular o comprovante.');
    }
    if (!fs.existsSync(textPath)) {
      fs.writeFileSync(textPath, 'Este é um arquivo de texto de teste para simular uma nota.');
    }

    // Preparar anexos
    const attachments = [
      {
        filename: 'formulario_reembolso.pdf',
        content: fs.readFileSync(pdfPath),
        contentType: 'application/pdf'
      },
      {
        filename: 'comprovante.jpg',
        content: fs.readFileSync(imagePath),
        contentType: 'image/jpeg'
      },
      {
        filename: 'nota.txt',
        content: fs.readFileSync(textPath),
        contentType: 'text/plain'
      }
    ];

    // Enviar email
    const info = await transporter.sendMail({
      from: `"ABZ Group" <${emailConfig.auth.user}>`,
      to,
      subject: 'Teste de Email com Anexos',
      text: 'Este é um email de teste com anexos para verificar o funcionamento do sistema de envio de emails.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0066cc; text-align: center;">Teste de Email com Anexos</h2>
          <p>Este é um email de teste para verificar o funcionamento do sistema de envio de emails com anexos.</p>
          <p>O email deve conter três anexos:</p>
          <ol>
            <li>Um arquivo PDF simulando o formulário de reembolso</li>
            <li>Um arquivo JPG simulando um comprovante</li>
            <li>Um arquivo TXT simulando uma nota</li>
          </ol>
          <p>Por favor, verifique se todos os anexos estão presentes no email.</p>
          <div style="margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
            <p style="margin: 0;"><strong>Data e hora do teste:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #999;">
            <p>Este é um email de teste. Por favor, ignore se recebeu por engano.</p>
            <p>ABZ Group - ${new Date().getFullYear()}</p>
          </div>
        </div>
      `,
      attachments
    });

    console.log('Email enviado com sucesso!');
    console.log('ID da mensagem:', info.messageId);
    console.log(`Email enviado para ${to} com ${attachments.length} anexos`);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar o teste
const testEmail = process.argv[2];
if (!testEmail) {
  console.error('Por favor, forneça um email de teste como argumento.');
  console.error('Exemplo: node scripts/test-email-direct.js seu-email@exemplo.com');
  process.exit(1);
}

sendTestEmail(testEmail)
  .then(result => {
    console.log('Resultado do teste:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
