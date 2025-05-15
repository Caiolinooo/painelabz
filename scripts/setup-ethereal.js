require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

async function setupEthereal() {
  console.log('Configurando Ethereal para testes de e-mail...');
  
  try {
    // Criar conta de teste Ethereal
    console.log('Criando conta de teste Ethereal...');
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('Conta criada:', {
      user: testAccount.user,
      pass: testAccount.pass
    });
    
    // Ler o arquivo .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch (error) {
      console.log('Arquivo .env não encontrado. Criando um novo...');
    }
    
    // Preparar as novas configurações
    const etherealConfig = `
# Configurações de Email (Ethereal - apenas para testes)
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=${testAccount.user}
EMAIL_PASSWORD=${testAccount.pass}
EMAIL_FROM="${testAccount.user}"
`;
    
    // Atualizar configurações no arquivo .env
    // Primeiro, remover configurações existentes de e-mail
    const emailConfigRegex = /(EMAIL_HOST|EMAIL_PORT|EMAIL_SECURE|EMAIL_USER|EMAIL_PASSWORD|EMAIL_FROM|SENDGRID_API_KEY)=.*/g;
    envContent = envContent.replace(emailConfigRegex, '');
    
    // Adicionar configuração ao arquivo .env
    await fs.writeFile(envPath, envContent + etherealConfig);
    
    console.log('Configuração do Ethereal adicionada com sucesso ao arquivo .env');
    console.log('Configurações adicionadas:');
    console.log('- EMAIL_HOST: smtp.ethereal.email');
    console.log('- EMAIL_PORT: 587');
    console.log('- EMAIL_SECURE: false');
    console.log('- EMAIL_USER:', testAccount.user);
    console.log('- EMAIL_PASSWORD:', testAccount.pass);
    console.log('- EMAIL_FROM:', testAccount.user);
    
    console.log('\nPara visualizar os e-mails enviados, acesse:');
    console.log('https://ethereal.email/login');
    console.log('E faça login com as credenciais acima.');
    
  } catch (error) {
    console.error('Erro ao configurar Ethereal:', error);
  }
}

// Executar a configuração
setupEthereal()
  .then(() => {
    console.log('Configuração concluída.');
  })
  .catch(error => {
    console.error('Erro durante a configuração:', error);
  });
