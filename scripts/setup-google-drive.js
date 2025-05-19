/**
 * Script para configurar as credenciais do Google Drive
 * Este script ajuda a configurar as credenciais do Google Drive para armazenamento de anexos
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

// Escopos necessários para o Google Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Interface de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Pergunta ao usuário e retorna a resposta
 * @param {string} question Pergunta a ser feita
 * @returns {Promise<string>} Resposta do usuário
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Função principal
 */
async function main() {
  console.log('=== Configuração do Google Drive para Armazenamento de Anexos ===');
  console.log('Este script irá ajudá-lo a configurar as credenciais do Google Drive para armazenamento de anexos de reembolso.');
  console.log('Você precisará criar um projeto no Google Cloud Console e configurar as credenciais OAuth 2.0.');
  console.log('');
  
  // Verificar se já existem credenciais configuradas
  const hasCredentials = process.env.GOOGLE_DRIVE_CLIENT_ID && 
                         process.env.GOOGLE_DRIVE_CLIENT_SECRET && 
                         process.env.GOOGLE_DRIVE_REDIRECT_URI && 
                         process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  
  if (hasCredentials) {
    console.log('Credenciais do Google Drive já estão configuradas:');
    console.log(`- Client ID: ${process.env.GOOGLE_DRIVE_CLIENT_ID.substring(0, 10)}...`);
    console.log(`- Client Secret: ${process.env.GOOGLE_DRIVE_CLIENT_SECRET.substring(0, 5)}...`);
    console.log(`- Redirect URI: ${process.env.GOOGLE_DRIVE_REDIRECT_URI}`);
    console.log(`- Refresh Token: ${process.env.GOOGLE_DRIVE_REFRESH_TOKEN.substring(0, 10)}...`);
    console.log('');
    
    const shouldReconfigure = await askQuestion('Deseja reconfigurar as credenciais? (s/N): ');
    if (shouldReconfigure.toLowerCase() !== 's') {
      console.log('Configuração mantida. Encerrando...');
      rl.close();
      return;
    }
  }
  
  console.log('Siga os passos abaixo para configurar as credenciais:');
  console.log('1. Acesse https://console.cloud.google.com/');
  console.log('2. Crie um novo projeto ou selecione um existente');
  console.log('3. Ative a API do Google Drive para o projeto');
  console.log('4. Configure as credenciais OAuth 2.0');
  console.log('5. Adicione http://localhost:3000/api/auth/callback/google como URI de redirecionamento');
  console.log('');
  
  // Solicitar as credenciais
  const clientId = await askQuestion('Client ID: ');
  const clientSecret = await askQuestion('Client Secret: ');
  const redirectUri = await askQuestion('Redirect URI (padrão: http://localhost:3000/api/auth/callback/google): ') || 'http://localhost:3000/api/auth/callback/google';
  
  // Criar cliente OAuth
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
  
  // Gerar URL de autorização
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Forçar a geração de um refresh token
  });
  
  console.log('');
  console.log('Acesse a URL abaixo para autorizar o aplicativo:');
  console.log(authUrl);
  console.log('');
  
  // Solicitar o código de autorização
  const code = await askQuestion('Cole o código de autorização aqui: ');
  
  try {
    // Trocar o código por tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.error('Erro: Refresh token não foi gerado. Certifique-se de usar o parâmetro prompt=consent na URL de autorização.');
      rl.close();
      return;
    }
    
    console.log('');
    console.log('Tokens obtidos com sucesso!');
    console.log('');
    
    // Atualizar o arquivo .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Remover configurações existentes
    envContent = envContent
      .replace(/^GOOGLE_DRIVE_CLIENT_ID=.*$/m, '')
      .replace(/^GOOGLE_DRIVE_CLIENT_SECRET=.*$/m, '')
      .replace(/^GOOGLE_DRIVE_REDIRECT_URI=.*$/m, '')
      .replace(/^GOOGLE_DRIVE_REFRESH_TOKEN=.*$/m, '')
      .replace(/\n\n+/g, '\n\n'); // Remover linhas em branco extras
    
    // Adicionar novas configurações
    envContent += `\n# Google Drive Configuration\nGOOGLE_DRIVE_CLIENT_ID=${clientId}\nGOOGLE_DRIVE_CLIENT_SECRET=${clientSecret}\nGOOGLE_DRIVE_REDIRECT_URI=${redirectUri}\nGOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    
    // Salvar o arquivo .env
    fs.writeFileSync(envPath, envContent);
    
    console.log('Credenciais salvas no arquivo .env');
    console.log('');
    console.log('Configuração concluída com sucesso!');
    console.log('Agora você pode usar o Google Drive para armazenamento de anexos.');
    
  } catch (error) {
    console.error('Erro ao obter tokens:', error.message);
  }
  
  rl.close();
}

// Executar a função principal
main().catch(console.error);
