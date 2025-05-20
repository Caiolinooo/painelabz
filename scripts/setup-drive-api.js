/**
 * Script para configurar a API do Google Drive
 * Este script ajuda a configurar a API Key e o ID da pasta do Google Drive
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
  console.log('=== Configuração da API do Google Drive para Armazenamento de Anexos ===');
  console.log('Este script irá ajudá-lo a configurar a API Key e o ID da pasta do Google Drive para armazenamento de anexos de reembolso.');
  console.log('');
  
  // Verificar se já existem credenciais configuradas
  const hasCredentials = process.env.GOOGLE_DRIVE_API_KEY && 
                         process.env.GOOGLE_DRIVE_FOLDER_ID;
  
  if (hasCredentials) {
    console.log('Configuração da API do Google Drive já existe:');
    console.log(`- API Key: ${process.env.GOOGLE_DRIVE_API_KEY.substring(0, 10)}...`);
    console.log(`- Folder ID: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
    console.log('');
    
    const shouldReconfigure = await askQuestion('Deseja reconfigurar? (s/N): ');
    if (shouldReconfigure.toLowerCase() !== 's') {
      console.log('Configuração mantida. Encerrando...');
      rl.close();
      return;
    }
  }
  
  console.log('Siga os passos abaixo para configurar a API do Google Drive:');
  console.log('1. Acesse https://console.cloud.google.com/');
  console.log('2. Crie um novo projeto ou selecione um existente');
  console.log('3. Ative a API do Google Drive para o projeto');
  console.log('4. Crie uma API Key em "Credenciais"');
  console.log('5. Crie uma pasta no Google Drive para armazenar os anexos e obtenha o ID da pasta');
  console.log('   (O ID da pasta é a parte final da URL quando você abre a pasta no Google Drive)');
  console.log('');
  
  // Solicitar as credenciais
  const apiKey = await askQuestion('API Key: ');
  const folderId = await askQuestion('ID da pasta no Google Drive: ');
  
  // Atualizar o arquivo .env
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Remover configurações existentes
  envContent = envContent
    .replace(/^GOOGLE_DRIVE_API_KEY=.*$/m, '')
    .replace(/^GOOGLE_DRIVE_FOLDER_ID=.*$/m, '')
    .replace(/^GOOGLE_DRIVE_CLIENT_ID=.*$/m, '')
    .replace(/^GOOGLE_DRIVE_CLIENT_SECRET=.*$/m, '')
    .replace(/^GOOGLE_DRIVE_REDIRECT_URI=.*$/m, '')
    .replace(/^GOOGLE_DRIVE_REFRESH_TOKEN=.*$/m, '')
    .replace(/\n\n+/g, '\n\n'); // Remover linhas em branco extras
  
  // Adicionar novas configurações
  envContent += `\n# Google Drive API Configuration\nGOOGLE_DRIVE_API_KEY=${apiKey}\nGOOGLE_DRIVE_FOLDER_ID=${folderId}\n`;
  
  // Salvar o arquivo .env
  fs.writeFileSync(envPath, envContent);
  
  console.log('');
  console.log('Configuração salva no arquivo .env');
  console.log('');
  console.log('Configuração concluída com sucesso!');
  console.log('Agora você pode usar o Google Drive para armazenamento de anexos.');
  
  rl.close();
}

// Executar a função principal
main().catch(console.error);
