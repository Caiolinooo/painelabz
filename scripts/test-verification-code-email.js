require('dotenv').config();
const nodemailer = require('nodemailer');

async function testVerificationCodeEmail() {
  const testEmail = process.argv[2] || 'test@example.com';

  console.log(`Testando envio de código de verificação para ${testEmail}...`);

  try {
    // Gerar código de verificação
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Código gerado: ${code}`);

    // Obter configurações do arquivo .env
    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT);
    const secure = process.env.EMAIL_SECURE === 'true';
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;

    console.log('Configuração de email carregada:', {
      host,
      port,
      secure,
      user,
      // Não mostrar a senha
    });

    // Criar transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });

    console.log('Verificando conexão com o servidor SMTP...');
    await transporter.verify();
    console.log('Conexão verificada com sucesso!');

    // Preparar o conteúdo do email
    const text = `Seu código de verificação é: ${code}. Este código expira em 10 minutos.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png" alt="ABZ Group Logo" style="max-width: 200px;">
        </div>
        <h2 style="color: #0066cc; text-align: center;">Seu Código de Verificação</h2>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
          ${code}
        </div>
        <p style="margin-bottom: 20px; text-align: center;">Este código expira em <strong>10 minutos</strong>.</p>
        <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
          Se você não solicitou este código, por favor ignore este email.
        </p>
        <div style="border-top: 1px solid #e0e0e0; margin-top: 20px; padding-top: 20px; text-align: center; font-size: 12px; color: #999;">
          &copy; ${new Date().getFullYear()} ABZ Group. Todos os direitos reservados.
        </div>
      </div>
    `;

    // Enviar email
    console.log('Enviando email...');
    const info = await transporter.sendMail({
      from: '"ABZ Group" <apiabz@groupabz.com>',
      to: testEmail,
      subject: 'Código de Verificação - ABZ Group',
      text,
      html
    });

    console.log('Email enviado com sucesso!');
    console.log('ID da mensagem:', info.messageId);

    // Obter URL de preview
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('URL de preview:', previewUrl);

    return {
      success: true,
      code,
      messageId: info.messageId,
      previewUrl
    };
  } catch (error) {
    console.error('Erro ao enviar código de verificação:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

testVerificationCodeEmail()
  .then(result => {
    console.log('Teste concluído.');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro no teste:', error);
    process.exit(1);
  });
