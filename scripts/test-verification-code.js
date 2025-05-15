require('dotenv').config();
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

// Implementar funções de teste diretamente
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Armazenamento em memória para os códigos de verificação
const verificationCodes = [];

function registerCode(identifier, method = 'email') {
  // Gerar código
  const code = generateCode();

  // Calcular data de expiração (15 minutos por padrão)
  const expiryMinutes = 15;
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + expiryMinutes);

  // Registrar o código
  const entry = {
    code,
    identifier,
    method,
    timestamp: new Date(),
    expires,
    used: false
  };

  // Remover códigos antigos para o mesmo identificador
  const index = verificationCodes.findIndex(
    (c) => c.identifier === identifier && c.method === method
  );

  if (index !== -1) {
    verificationCodes.splice(index, 1);
  }

  // Adicionar o novo código
  verificationCodes.push(entry);

  console.log(`Código ${code} registrado para ${identifier} via ${method}`);

  return {
    code,
    expires
  };
}

function getActiveCodes() {
  return [...verificationCodes];
}

function getLatestCode(identifier) {
  // Ordenar por timestamp (mais recente primeiro)
  const sorted = [...verificationCodes]
    .filter(c => c.identifier === identifier && !c.used)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return sorted.length > 0 ? sorted[0].code : null;
}

// Função para enviar e-mail com código de verificação
async function sendVerificationEmail(email, code) {
  console.log(`Enviando e-mail com código de verificação para ${email}...`);

  // Verificar se temos a chave do SendGrid
  const sendgridApiKey = process.env.SENDGRID_API_KEY || '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';

  // Configurar SendGrid
  sgMail.setApiKey(sendgridApiKey);

  try {
    // Preparar o conteúdo do e-mail
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Texto simples para clientes que não suportam HTML
    const text = `
Código de Verificação - ABZ Group

Seu código de verificação é: ${code}

Este código expira em 10 minutos.

Se você não solicitou este código, por favor ignore este email.

--
ABZ Group
https://groupabz.com
${new Date().getFullYear()} © Todos os direitos reservados.
    `.trim();

    // Versão HTML do email
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .container { padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { max-width: 200px; height: auto; }
    .code { background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 5px; font-weight: bold; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${appUrl}/images/LC1_Azul.png" alt="ABZ Group Logo" class="logo" style="max-width: 200px; height: auto;">
      <h2>Código de Verificação</h2>
    </div>

    <p>Olá,</p>

    <p>Recebemos uma solicitação para verificar seu endereço de e-mail. Use o código abaixo para confirmar:</p>

    <div class="code">${code}</div>

    <p>Este código expira em <strong>10 minutos</strong>.</p>

    <p>Se você não solicitou este código, por favor ignore este email.</p>

    <div class="footer">
      <p>ABZ Group</p>
      <p><a href="https://groupabz.com">https://groupabz.com</a></p>
      <p>${new Date().getFullYear()} &copy; Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Enviar e-mail usando a API do SendGrid
    const msg = {
      to: email,
      from: 'apiabzgroup@gmail.com',
      subject: 'Código de Verificação - ABZ Group',
      text,
      html
    };

    await sgMail.send(msg);
    console.log('E-mail com código de verificação enviado com sucesso!');

    return {
      success: true,
      message: 'E-mail com código de verificação enviado com sucesso'
    };
  } catch (error) {
    console.error('Erro ao enviar e-mail com código de verificação:', error);

    return {
      success: false,
      message: `Erro ao enviar e-mail com código de verificação: ${error.message}`,
      error
    };
  }
}

// Função para testar o serviço de códigos com envio de e-mail
async function testCodeService() {
  console.log('Testando serviço de códigos de verificação com envio de e-mail...');

  // Obter o email de teste dos argumentos da linha de comando
  const testEmail = process.argv[2];
  if (!testEmail) {
    console.error('Por favor, forneça um email de teste como argumento.');
    console.error('Exemplo: node scripts/test-verification-code.js seu-email@exemplo.com');
    return {
      success: false,
      message: 'Email de teste não fornecido'
    };
  }

  console.log(`Gerando código para ${testEmail}...`);

  // Registrar o código
  const result = registerCode(testEmail, 'email');
  console.log('Código gerado:', result.code);
  console.log('Expira em:', result.expires);

  // Verificar se o código foi registrado corretamente
  const activeCodes = getActiveCodes();
  console.log('Códigos ativos:', JSON.stringify(activeCodes, null, 2));

  // Obter o código mais recente para o email
  const latestCode = getLatestCode(testEmail);
  console.log('Código mais recente para', testEmail, ':', latestCode);

  // Enviar e-mail com o código
  const emailResult = await sendVerificationEmail(testEmail, result.code);

  return {
    success: emailResult.success,
    code: result.code,
    expires: result.expires,
    emailSent: emailResult.success,
    message: emailResult.message
  };
}

// Executar o teste
testCodeService()
  .then(result => {
    console.log('\nResultado do teste:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\nTeste concluído com sucesso!');
      console.log('Código de verificação:', result.code);
      console.log('Expira em:', result.expires);
      console.log('\nVerifique sua caixa de entrada para confirmar o recebimento do e-mail.');
    } else {
      console.error('\nFalha ao executar teste.');
      console.error('Verifique as mensagens de erro acima e tente novamente.');
    }
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
  });
