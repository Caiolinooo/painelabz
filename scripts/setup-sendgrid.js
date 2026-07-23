require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

async function setupSendgrid() {
  console.log('Configurando SendGrid...');

  // Verificar se já temos a chave do SendGrid no .env
  if (process.env.SENDGRID_API_KEY) {
    console.log('A chave do SendGrid já está configurada no arquivo .env');
    return;
  }

  // Chave do SendGrid fornecida
  const sendgridApiKey = '[REDACTED_SENDGRID_API_KEY]';

  try {
    // Ler o arquivo .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch (error) {
      console.log('Arquivo .env não encontrado. Criando um novo...');
    }

    // Verificar se já existe configuração de SendGrid
    if (envContent.includes('SENDGRID_API_KEY')) {
      console.log('Configuração do SendGrid já existe no arquivo .env');
      return;
    }

    // Preparar as novas configurações
    const sendgridConfig = `
# Configurações de Email (SendGrid)
SENDGRID_API_KEY=${sendgridApiKey}
EMAIL_FROM=***REMOVED***
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=${sendgridApiKey}
`;

    // Adicionar configuração ao arquivo .env
    await fs.writeFile(envPath, envContent + sendgridConfig);

    console.log('Configuração do SendGrid adicionada com sucesso ao arquivo .env');
    console.log('Configurações adicionadas:');
    console.log('- SENDGRID_API_KEY: ********');
    console.log('- EMAIL_FROM: document.getElementById(');
    console.log('- EMAIL_HOST: smtp.sendgrid.net');
    console.log('- EMAIL_PORT: 587');
    console.log('- EMAIL_SECURE: false');
    console.log('- EMAIL_USER: apikey');
    console.log('- EMAIL_PASSWORD: ********');

  } catch (error) {
    console.error('Erro ao configurar SendGrid:', error);
  }
}

// Executar a configuração
setupSendgrid()
  .then(() => {
    console.log('Configuração concluída.');
  })
  .catch(error => {
    console.error('Erro durante a configuração:', error);
  });
