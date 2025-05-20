// Script para fazer backup do código atual no GitHub
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Verificar se o diretório atual é um repositório Git
function isGitRepository() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Obter o status do repositório
function getGitStatus() {
  try {
    return execSync('git status --porcelain').toString().trim();
  } catch (error) {
    console.error('Erro ao verificar status do Git:', error.message);
    return '';
  }
}

// Verificar se o remote está configurado corretamente
function checkRemote() {
  try {
    const remotes = execSync('git remote -v').toString().trim();
    return remotes.includes('github.com/Caiolinooo/painelabz');
  } catch (error) {
    console.error('Erro ao verificar remotes do Git:', error.message);
    return false;
  }
}

// Configurar o remote correto
function configureRemote() {
  try {
    // Verificar se o remote origin já existe
    const remotes = execSync('git remote').toString().trim().split('\n');
    
    if (remotes.includes('origin')) {
      // Atualizar o remote existente
      execSync('git remote set-url origin https://github.com/Caiolinooo/painelabz.git');
      console.log('Remote origin atualizado para https://github.com/Caiolinooo/painelabz.git');
    } else {
      // Adicionar novo remote
      execSync('git remote add origin https://github.com/Caiolinooo/painelabz.git');
      console.log('Remote origin adicionado: https://github.com/Caiolinooo/painelabz.git');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao configurar remote do Git:', error.message);
    return false;
  }
}

// Fazer commit das alterações
function commitChanges(message) {
  try {
    execSync('git add .');
    execSync(`git commit -m "${message}"`);
    return true;
  } catch (error) {
    console.error('Erro ao fazer commit:', error.message);
    return false;
  }
}

// Fazer push para o GitHub
function pushToGitHub() {
  try {
    execSync('git push origin main');
    return true;
  } catch (error) {
    console.error('Erro ao fazer push para o GitHub:', error.message);
    
    // Tentar fazer push com --force se necessário
    try {
      console.log('Tentando push com --force...');
      execSync('git push origin main --force');
      return true;
    } catch (forceError) {
      console.error('Erro ao fazer push com --force:', forceError.message);
      return false;
    }
  }
}

// Função principal
async function main() {
  console.log('Iniciando backup do código no GitHub...');
  
  // Verificar se estamos em um repositório Git
  if (!isGitRepository()) {
    console.error('Erro: Diretório atual não é um repositório Git');
    process.exit(1);
  }
  
  // Verificar se há alterações para commit
  const status = getGitStatus();
  if (!status) {
    console.log('Não há alterações para commit');
  } else {
    console.log('Alterações detectadas:');
    console.log(status);
  }
  
  // Verificar e configurar remote
  if (!checkRemote()) {
    console.log('Remote não configurado corretamente, atualizando...');
    if (!configureRemote()) {
      console.error('Erro: Não foi possível configurar o remote');
      process.exit(1);
    }
  }
  
  // Fazer commit das alterações
  const commitMessage = 'Backup antes da implementação de segurança e correções de banco de dados';
  if (status && !commitChanges(commitMessage)) {
    console.error('Erro: Não foi possível fazer commit das alterações');
    process.exit(1);
  }
  
  // Fazer push para o GitHub
  if (!pushToGitHub()) {
    console.error('Erro: Não foi possível fazer push para o GitHub');
    process.exit(1);
  }
  
  console.log('Backup concluído com sucesso!');
}

// Executar função principal
main()
  .then(() => {
    console.log('Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  });
