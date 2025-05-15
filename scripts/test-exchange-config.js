/**
 * Script para testar a configuração do Microsoft Exchange/Office 365
 * Este script verifica a conexão com o servidor Exchange e envia um email de teste
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

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

async function testExchangeConfig() {
  console.log(`${colors.bold}${colors.blue}=== Testando configuração de e-mail com Exchange/Office 365 ===${colors.reset}`);
  console.log('Configurações atuais:');
  console.log(`- EMAIL_HOST: ${colors.cyan}${process.env.EMAIL_HOST || 'smtp.office365.com'}${colors.reset}`);
  console.log(`- EMAIL_PORT: ${colors.cyan}${process.env.EMAIL_PORT || '587'}${colors.reset}`);
  console.log(`- EMAIL_SECURE: ${colors.cyan}${process.env.EMAIL_SECURE || 'false'}${colors.reset}`);
  console.log(`- EMAIL_USER: ${colors.cyan}${process.env.EMAIL_USER || 'não definido'}${colors.reset}`);
  console.log(`- EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '******' : colors.red + 'não definido' + colors.reset}`);
  console.log(`- EMAIL_FROM: ${colors.cyan}${process.env.EMAIL_FROM || 'não definido'}${colors.reset}`);

  // Verificar se as variáveis obrigatórias estão definidas
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log(`\n${colors.red}${colors.bold}Erro: EMAIL_USER e EMAIL_PASSWORD são obrigatórios.${colors.reset}`);
    console.log('Por favor, defina essas variáveis no arquivo .env e tente novamente.');
    process.exit(1);
  }

  // Configuração do Exchange/Office 365
  const exchangeConfig = {
    host: process.env.EMAIL_HOST || 'smtp.office365.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
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
    // Configurações de segurança para Exchange/Office 365
    tls: {
      rejectUnauthorized: false, // Aceitar certificados auto-assinados para teste
      ciphers: 'SSLv3',
      minVersion: 'TLSv1.2'
    },
    // Configurações específicas para Exchange/Office 365
    requireTLS: true,
    opportunisticTLS: true
  };

  try {
    console.log(`\n${colors.bold}Tentando criar transporter com Exchange/Office 365...${colors.reset}`);
    const transporter = nodemailer.createTransport(exchangeConfig);
    
    console.log(`${colors.bold}Verificando conexão com o servidor SMTP...${colors.reset}`);
    await transporter.verify();
    console.log(`${colors.green}${colors.bold}✓ Conexão com o servidor Exchange/Office 365 verificada com sucesso!${colors.reset}`);

    // Perguntar se deseja enviar um email de teste
    const destinationEmail = process.argv[2];
    if (destinationEmail) {
      console.log(`\n${colors.bold}Enviando email de teste para ${destinationEmail}...${colors.reset}`);
      
      // Preparar conteúdo do email
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"ABZ Group" <${process.env.EMAIL_USER}>`,
        to: destinationEmail,
        subject: 'Teste de Configuração Exchange/Office 365',
        text: `Este é um email de teste enviado pelo sistema ABZ Group usando Exchange/Office 365.\n\nData e hora: ${new Date().toLocaleString('pt-BR')}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="${process.env.EMAIL_LOGO_URL || 'https://abzgroup.com.br/wp-content/uploads/2023/05/LC1_Azul.png'}" alt="ABZ Group Logo" style="max-width: 200px;">
            </div>
            <h2 style="color: #0066cc; text-align: center;">Teste de Configuração Exchange/Office 365</h2>
            <p style="margin-bottom: 20px; text-align: center;">
              Este é um email de teste enviado pelo sistema ABZ Group usando Exchange/Office 365.
            </p>
            <p style="margin-bottom: 20px; text-align: center;">
              Se você está vendo este email, a configuração foi bem-sucedida!
            </p>
            <p style="margin-bottom: 20px; text-align: center;">
              Data e hora: <strong>${new Date().toLocaleString('pt-BR')}</strong>
            </p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; font-size: 12px; color: #666;">
                Este é um email automático. Por favor, não responda.
              </p>
            </div>
          </div>
        `,
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
          'X-Mailer': 'ABZ Group Mailer',
          'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply'
        }
      };

      // Enviar email
      const info = await transporter.sendMail(mailOptions);
      console.log(`${colors.green}${colors.bold}✓ Email de teste enviado com sucesso!${colors.reset}`);
      console.log(`ID da mensagem: ${info.messageId}`);
      
      // Verificar se é Ethereal para mostrar URL de preview
      try {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`\n${colors.cyan}URL de preview: ${previewUrl}${colors.reset}`);
        }
      } catch (error) {
        // Ignorar erro (normal para Exchange)
      }
    }

    console.log(`\n${colors.green}${colors.bold}✓ Configuração do Exchange/Office 365 está correta!${colors.reset}`);
    console.log(`\nSugestão para o arquivo .env:`);
    console.log(`EMAIL_HOST=${exchangeConfig.host}`);
    console.log(`EMAIL_PORT=${exchangeConfig.port}`);
    console.log(`EMAIL_SECURE=${exchangeConfig.secure}`);
    console.log(`EMAIL_USER=${exchangeConfig.auth.user}`);
    console.log(`EMAIL_PASSWORD=sua-senha`);
    console.log(`EMAIL_FROM="ABZ Group" <${exchangeConfig.auth.user}>`);
    
    return {
      success: true,
      config: {
        host: exchangeConfig.host,
        port: exchangeConfig.port,
        secure: exchangeConfig.secure,
        user: exchangeConfig.auth.user
      }
    };
  } catch (error) {
    console.log(`\n${colors.red}${colors.bold}✗ Erro ao conectar com Exchange/Office 365:${colors.reset}`);
    console.log(error.message);
    
    console.log(`\n${colors.yellow}${colors.bold}Tentando criar conta de teste Ethereal como alternativa...${colors.reset}`);
    try {
      const testAccount = await nodemailer.createTestAccount();
      
      console.log(`${colors.green}${colors.bold}✓ Conta de teste Ethereal criada com sucesso!${colors.reset}`);
      console.log(`\nPara testes, você pode usar Ethereal:`);
      console.log(`EMAIL_HOST=smtp.ethereal.email`);
      console.log(`EMAIL_PORT=587`);
      console.log(`EMAIL_SECURE=false`);
      console.log(`EMAIL_USER=${testAccount.user}`);
      console.log(`EMAIL_PASSWORD=${testAccount.pass}`);
      
      return {
        success: false,
        etherealAccount: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      };
    } catch (etherealError) {
      console.log(`\n${colors.red}${colors.bold}✗ Erro ao criar conta de teste Ethereal:${colors.reset}`);
      console.log(etherealError.message);
      
      return {
        success: false
      };
    }
  }
}

// Executar o teste
testExchangeConfig()
  .then(result => {
    if (result.success) {
      console.log(`\n${colors.green}${colors.bold}Teste concluído com sucesso!${colors.reset}`);
      
      if (!process.argv[2]) {
        console.log(`\nPara enviar um email de teste, execute:`);
        console.log(`node scripts/test-exchange-config.js seu-email@exemplo.com`);
      }
    } else {
      console.log(`\n${colors.yellow}${colors.bold}Teste concluído com avisos.${colors.reset}`);
      console.log(`Verifique as mensagens acima para mais detalhes.`);
    }
  })
  .catch(error => {
    console.error(`\n${colors.red}${colors.bold}Erro ao executar teste:${colors.reset}`, error);
    process.exit(1);
  });
