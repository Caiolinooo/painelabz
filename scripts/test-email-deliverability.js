/**
 * Script para testar a entregabilidade de emails
 * Este script envia um email de teste e verifica se os cabeçalhos estão configurados corretamente
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Função para verificar configurações de email
async function checkEmailConfig() {
  console.log(`${colors.bold}${colors.blue}=== Verificando Configurações de Email ===${colors.reset}`);
  
  // Verificar variáveis de ambiente
  const requiredVars = [
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'EMAIL_FROM'
  ];
  
  const recommendedVars = [
    'DKIM_PRIVATE_KEY',
    'DKIM_DOMAIN',
    'DKIM_SELECTOR',
    'EMAIL_REPLY_TO',
    'EMAIL_CONTACT'
  ];
  
  let missingRequired = false;
  let missingRecommended = false;
  
  console.log(`\n${colors.bold}Verificando variáveis de ambiente obrigatórias:${colors.reset}`);
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.log(`${colors.red}✗ ${varName} não está definido${colors.reset}`);
      missingRequired = true;
    } else {
      const value = varName.includes('PASSWORD') 
        ? '********' 
        : process.env[varName];
      console.log(`${colors.green}✓ ${varName}=${value}${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.bold}Verificando variáveis de ambiente recomendadas:${colors.reset}`);
  for (const varName of recommendedVars) {
    if (!process.env[varName]) {
      console.log(`${colors.yellow}⚠ ${varName} não está definido${colors.reset}`);
      missingRecommended = true;
    } else {
      const value = varName.includes('KEY') || varName.includes('PASSWORD')
        ? '********' 
        : process.env[varName];
      console.log(`${colors.green}✓ ${varName}=${value}${colors.reset}`);
    }
  }
  
  if (missingRequired) {
    console.log(`\n${colors.red}${colors.bold}Erro: Variáveis de ambiente obrigatórias estão faltando.${colors.reset}`);
    console.log(`Configure-as no arquivo .env antes de continuar.`);
    return false;
  }
  
  if (missingRecommended) {
    console.log(`\n${colors.yellow}${colors.bold}Aviso: Algumas variáveis recomendadas estão faltando.${colors.reset}`);
    console.log(`Para melhorar a entregabilidade, considere configurar todas as variáveis recomendadas.`);
  }
  
  return true;
}

// Função para criar configuração de email
function createEmailConfig() {
  // Configuração base
  const config = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Configurações para melhorar a entregabilidade
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Configurações de timeout
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // Configurações de segurança
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      ciphers: 'SSLv3',
      minVersion: 'TLSv1.2'
    },
    // Configurações adicionais
    name: 'ABZ Group Mailer',
    opportunisticTLS: true
  };
  
  // Adicionar DKIM se disponível
  if (process.env.DKIM_PRIVATE_KEY) {
    config.dkim = {
      domainName: process.env.DKIM_DOMAIN,
      keySelector: process.env.DKIM_SELECTOR,
      privateKey: process.env.DKIM_PRIVATE_KEY
    };
    console.log(`${colors.green}✓ Configuração DKIM adicionada${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ DKIM não configurado${colors.reset}`);
  }
  
  return config;
}

// Função para enviar email de teste
async function sendTestEmail(to) {
  console.log(`\n${colors.bold}${colors.blue}=== Enviando Email de Teste ===${colors.reset}`);
  console.log(`Destinatário: ${to}`);
  
  try {
    // Criar configuração
    const config = createEmailConfig();
    
    // Criar transporter
    const transporter = nodemailer.createTransport(config);
    
    // Verificar conexão
    console.log(`\nVerificando conexão com o servidor SMTP...`);
    await transporter.verify();
    console.log(`${colors.green}✓ Conexão com o servidor SMTP verificada com sucesso${colors.reset}`);
    
    // Preparar conteúdo do email
    const subject = 'Teste de Entregabilidade - ABZ Group';
    const text = `
Este é um email de teste para verificar a entregabilidade.

Se você está vendo este email, significa que ele não foi marcado como spam.

Data e hora do envio: ${new Date().toLocaleString('pt-BR')}

--
ABZ Group
https://abzgroup.com.br
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teste de Entregabilidade</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); max-width: 600px; margin: 0 auto;">
          <tr>
            <td align="center" style="padding: 30px 20px;">
              <img src="${process.env.EMAIL_LOGO_URL || 'https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png'}" alt="ABZ Group Logo" width="200" style="display: block; max-width: 200px; height: auto;">
            </td>
          </tr>
          <tr>
            <td style="padding: 0 20px 20px 20px;">
              <h1 style="color: #0066cc; text-align: center; margin-top: 0;">Teste de Entregabilidade</h1>
              <p style="margin-bottom: 20px;">Este é um email de teste para verificar a entregabilidade.</p>
              <p style="margin-bottom: 20px;">Se você está vendo este email, significa que ele não foi marcado como spam.</p>
              <p style="margin-bottom: 20px;">Data e hora do envio: <strong>${new Date().toLocaleString('pt-BR')}</strong></p>
              
              <div style="background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-weight: bold; color: #ff6d00;">⚠️ Importante: Verifique sua pasta de spam</p>
                <p style="margin: 8px 0 0 0; font-size: 14px;">
                  Se este email foi para sua pasta de spam, por favor marque-o como "não é spam" e adicione
                  <strong>${process.env.EMAIL_USER}</strong> à sua lista de contatos.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="font-size: 12px; color: #999999; margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} ABZ Group. Todos os direitos reservados.</p>
              <p style="font-size: 12px; color: #999999; margin: 0;">
                <a href="https://abzgroup.com.br" style="color: #0066cc; text-decoration: none;">abzgroup.com.br</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
    
    // Preparar opções do email
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
      // Cabeçalhos para melhorar a entregabilidade
      headers: {
        // Prioridade normal
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal',
        // Identificação do remetente
        'X-Mailer': 'ABZ Group Mailer',
        'X-Sender': process.env.EMAIL_USER,
        // Opção de descadastramento
        'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER}?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        // Identificação da mensagem
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substring(2)}@${process.env.DKIM_DOMAIN || 'abzgroup.com.br'}>`,
        // Feedback loop
        'Feedback-ID': `${Date.now()}:abzgroup:test`,
        // Cabeçalhos adicionais
        'X-Report-Abuse': `Please report abuse to ${process.env.EMAIL_CONTACT || 'contato@abzgroup.com.br'}`,
        'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply',
        'Precedence': 'bulk',
        'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        'X-Email-Type': 'transactional'
      },
      // Configurações adicionais
      priority: 'normal',
      messageId: `<${Date.now()}.${Math.random().toString(36).substring(2)}@${process.env.DKIM_DOMAIN || 'abzgroup.com.br'}>`,
      replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER
    };
    
    // Enviar email
    console.log(`\nEnviando email...`);
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`${colors.green}✓ Email enviado com sucesso!${colors.reset}`);
    console.log(`ID da mensagem: ${info.messageId}`);
    
    // Verificar se é Ethereal para mostrar URL de preview
    try {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`\n${colors.cyan}URL de preview: ${previewUrl}${colors.reset}`);
      }
    } catch (error) {
      // Ignorar erro (normal para provedores reais)
    }
    
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Erro ao enviar email: ${error.message}${colors.reset}`);
    return false;
  }
}

// Função principal
async function main() {
  console.log(`${colors.bold}${colors.magenta}====================================${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}= TESTE DE ENTREGABILIDADE DE EMAIL =${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}====================================${colors.reset}\n`);
  
  // Verificar configurações
  const configOk = await checkEmailConfig();
  if (!configOk) {
    process.exit(1);
  }
  
  // Solicitar email de destino
  const destinationEmail = process.argv[2];
  if (!destinationEmail) {
    console.log(`\n${colors.yellow}Por favor, forneça um email de destino como argumento:${colors.reset}`);
    console.log(`node scripts/test-email-deliverability.js seu-email@exemplo.com`);
    process.exit(1);
  }
  
  // Enviar email de teste
  const success = await sendTestEmail(destinationEmail);
  
  if (success) {
    console.log(`\n${colors.green}${colors.bold}Teste concluído com sucesso!${colors.reset}`);
    console.log(`Por favor, verifique a caixa de entrada e a pasta de spam do email ${destinationEmail}.`);
    console.log(`Se o email foi para a pasta de spam, consulte o arquivo docs/EMAIL_CONFIGURATION.md para instruções de configuração.`);
  } else {
    console.log(`\n${colors.red}${colors.bold}Teste falhou.${colors.reset}`);
    console.log(`Verifique as configurações de email e tente novamente.`);
  }
}

// Executar função principal
main().catch(error => {
  console.error(`${colors.red}Erro não tratado: ${error.message}${colors.reset}`);
  process.exit(1);
});
