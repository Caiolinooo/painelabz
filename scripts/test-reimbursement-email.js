/**
 * Script para testar o envio de email de reembolso com anexos
 * Este script simula o envio de um email de reembolso com um formulário PDF e um comprovante
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Importar a função de envio de email
const { sendEmail } = require('../dist/lib/email-gmail');

// Criar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be defined in the .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testReimbursementEmail() {
  try {
    console.log('Testando envio de email de reembolso com anexos...');
    
    // Obter o email de teste
    const testEmail = process.argv[2];
    if (!testEmail) {
      console.error('Por favor, forneça um email de teste como argumento.');
      console.error('Exemplo: node scripts/test-reimbursement-email.js seu-email@exemplo.com');
      process.exit(1);
    }
    
    // Criar um arquivo de teste para simular o formulário PDF
    const formPdfPath = path.join(__dirname, 'test-form.pdf');
    
    // Verificar se já existe um arquivo PDF de teste
    if (!fs.existsSync(formPdfPath)) {
      console.log('Criando arquivo PDF de teste...');
      // Criar um arquivo de texto simples como fallback
      fs.writeFileSync(formPdfPath, 'Este é um arquivo de teste para simular o formulário PDF.');
    }
    
    // Criar um arquivo de teste para simular o comprovante
    const receiptPath = path.join(__dirname, 'test-receipt.jpg');
    
    // Verificar se já existe um arquivo de comprovante de teste
    if (!fs.existsSync(receiptPath)) {
      console.log('Criando arquivo de comprovante de teste...');
      // Criar um arquivo de texto simples como fallback
      fs.writeFileSync(receiptPath, 'Este é um arquivo de teste para simular o comprovante.');
    }
    
    // Preparar o email
    const subject = 'Teste de Email de Reembolso com Anexos';
    const text = 'Este é um email de teste para verificar o envio de reembolsos com anexos.';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #0066cc; text-align: center;">Teste de Email de Reembolso</h2>
        <p>Este é um email de teste para verificar o envio de reembolsos com anexos.</p>
        <p>O email deve conter dois anexos:</p>
        <ol>
          <li>Um PDF do formulário de reembolso</li>
          <li>Um arquivo simulando o comprovante</li>
        </ol>
        <p>Por favor, verifique se ambos os anexos estão presentes no email.</p>
        <div style="margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
          <p style="margin: 0;"><strong>Data e hora do teste:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        </div>
        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #999;">
          <p>Este é um email de teste. Por favor, ignore se recebeu por engano.</p>
          <p>ABZ Group - ${new Date().getFullYear()}</p>
        </div>
      </div>
    `;
    
    // Preparar os anexos
    const attachments = [
      {
        filename: 'Formulario_Reembolso_TESTE_123.pdf',
        path: formPdfPath,
        contentType: 'application/pdf'
      },
      {
        filename: 'Comprovante_TESTE_123.jpg',
        path: receiptPath,
        contentType: 'image/jpeg'
      }
    ];
    
    console.log(`Enviando email para ${testEmail} com ${attachments.length} anexos...`);
    
    // Enviar o email
    const result = await sendEmail(
      testEmail,
      subject,
      text,
      html,
      {
        attachments: attachments
      }
    );
    
    if (result.success) {
      console.log('Email enviado com sucesso!');
      console.log('Detalhes:', result);
    } else {
      console.error('Erro ao enviar email:', result.message);
    }
    
    // Limpar arquivos temporários
    console.log('Limpando arquivos temporários...');
    // Comentado para manter os arquivos para testes futuros
    // fs.unlinkSync(formPdfPath);
    // fs.unlinkSync(receiptPath);
    
    return result;
  } catch (error) {
    console.error('Erro ao testar email de reembolso:', error);
    return {
      success: false,
      message: `Erro ao testar email de reembolso: ${error.message || error}`
    };
  }
}

// Executar o teste
testReimbursementEmail()
  .then(result => {
    console.log('Teste concluído:', result.success ? 'Sucesso' : 'Falha');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
