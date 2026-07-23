/**
 * Script para testar o envio de e-mail
 *
 * Este script testa o envio de e-mail usando a configuração do sistema.
 * Ele pode ser usado para verificar se a configuração de e-mail está correta.
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// Função para inicializar o transporte de e-mail
async function initEmailTransport() {
  console.log('Inicializando transporte de e-mail...');

  // Verificar se temos configuração de e-mail
  if (process.env.EMAIL_SERVER) {
    // Configuração com as credenciais do Gmail (usando senha de aplicativo)
    console.log('Usando configuração de e-mail real (Gmail com senha de aplicativo)');
    try {
      // Verificar se a string de conexão está correta
      console.log('String de conexão:', process.env.EMAIL_SERVER.replace(/:[^:]*@/, ':****@'));
      const transporter = nodemailer.createTransport(process.env.EMAIL_SERVER);

      // Verificar a conexão
      await transporter.verify();
      console.log('Conexão com o servidor de e-mail verificada com sucesso');
      return transporter;
    } catch (error) {
      console.error('Erro ao configurar transporte de e-mail real:', error);
      console.log('Fallback para configuração de e-mail de teste (Ethereal)');

      // Fallback para Ethereal em caso de erro
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('Credenciais de e-mail de teste criadas:', {
        user: testAccount.user,
        pass: testAccount.pass,
        previewURL: `https://ethereal.email/message/`,
      });

      return transporter;
    }
  } else {
    // Configuração para desenvolvimento/teste usando Ethereal
    console.log('Usando configuração de e-mail de teste (Ethereal)');
    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log('Credenciais de e-mail de teste criadas:', {
      user: testAccount.user,
      pass: testAccount.pass,
      previewURL: `https://ethereal.email/message/`,
    });

    return transporter;
  }
}

// Função para enviar e-mail de teste
async function sendTestEmail(email) {
  try {
    console.log(`Enviando e-mail de teste para: ${email}`);

    // Inicializar o transporte
    const transporter = await initEmailTransport();

    // Conteúdo do e-mail
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ABZ Group" <noreply@abzgroup.com>',
      to: email,
      subject: 'Teste de E-mail - ABZ Group',
      text: 'Este é um e-mail de teste para verificar a configuração do sistema de e-mail.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${process.env.EMAIL_LOGO_URL || 'https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png'}" alt="ABZ Group Logo" style="max-width: 200px;">
          </div>
          <h2 style="color: #0066cc; text-align: center;">Teste de E-mail</h2>
          <p style="margin-bottom: 20px; text-align: center;">
            Este é um e-mail de teste para verificar a configuração do sistema de e-mail.
          </p>
          <p style="margin-bottom: 20px; text-align: center;">
            Se você está vendo este e-mail, a configuração está funcionando corretamente.
          </p>
          <div style="border-top: 1px solid #e0e0e0; margin-top: 20px; padding-top: 20px; text-align: center; font-size: 12px; color: #999;">
            &copy; ${new Date().getFullYear()} ABZ Group. Todos os direitos reservados.
          </div>
        </div>
      `,
    };

    // Enviar e-mail
    const info = await transporter.sendMail(mailOptions);
    console.log('E-mail enviado com sucesso. ID da mensagem:', info.messageId);

    // Se estamos usando Ethereal, retornar a URL de preview
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('URL de preview do e-mail:', previewUrl);
    }

    return {
      success: true,
      message: 'E-mail de teste enviado com sucesso',
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    };
  } catch (error) {
    console.error('Erro ao enviar e-mail de teste:', error);
    return {
      success: false,
      message: `Erro ao enviar e-mail de teste: ${error.message}`,
    };
  }
}

// Função principal
async function main() {
  // Obter o e-mail de destino da linha de comando ou usar o e-mail padrão
  const email = process.argv[2] || process.env.ADMIN_EMAIL || 'teste@example.com';

  console.log('Iniciando teste de e-mail...');
  console.log('Configurações:');
  console.log('- EMAIL_SERVER:', process.env.EMAIL_SERVER ? 'Configurado' : 'Não configurado');
  console.log('- EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('- E-mail de destino:', email);

  // Enviar e-mail de teste
  const result = await sendTestEmail(email);

  // Exibir resultado
  console.log('Resultado:', result);

  // Encerrar o processo
  process.exit(result.success ? 0 : 1);
}

// Executar o script
main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
