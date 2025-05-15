// Script para executar todas as correções em sequência
require('dotenv').config();
const { execSync } = require('child_process');

console.log('Iniciando execução de todas as correções...');

// Função para executar um script
function runScript(scriptName) {
  console.log(`\n=== Executando script ${scriptName} ===`);
  try {
    execSync(`node scripts/${scriptName}.js`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Erro ao executar script ${scriptName}:`, error.message);
    return false;
  }
}

// Executar scripts em sequência
async function runAllFixes() {
  try {
    // 1. Corrigir usuário administrador
    const adminFixed = runScript('fix-admin-user');
    if (!adminFixed) {
      console.error('Falha ao corrigir usuário administrador. Abortando...');
      process.exit(1);
    }
    
    // 2. Corrigir verificação de tokens
    const tokenVerificationFixed = runScript('fix-token-verification');
    if (!tokenVerificationFixed) {
      console.error('Falha ao corrigir verificação de tokens. Continuando...');
    }
    
    // 3. Corrigir APIs de administração
    const adminApiFixed = runScript('fix-admin-api');
    if (!adminApiFixed) {
      console.error('Falha ao corrigir APIs de administração. Continuando...');
    }
    
    // 4. Corrigir API de listagem de usuários
    const usersApiFixed = runScript('fix-users-api');
    if (!usersApiFixed) {
      console.error('Falha ao corrigir API de listagem de usuários. Continuando...');
    }
    
    // 5. Corrigir armazenamento de tokens
    const tokenStorageFixed = runScript('fix-token-storage');
    if (!tokenStorageFixed) {
      console.error('Falha ao corrigir armazenamento de tokens. Continuando...');
    }
    
    console.log('\n=== Todas as correções foram executadas ===');
    console.log('\nPróximos passos:');
    console.log('1. Abra o arquivo token-tester.html em um navegador');
    console.log('2. Salve o token de administrador gerado');
    console.log('3. Acesse a aplicação e verifique se a autenticação está funcionando');
    console.log('4. Se ainda houver problemas, verifique os logs do servidor para mais detalhes');
  } catch (error) {
    console.error('Erro durante a execução das correções:', error);
  }
}

// Executar todas as correções
runAllFixes();
