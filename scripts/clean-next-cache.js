/**
 * Script para limpar o cache do Next.js
 * Este script remove os diretórios de cache do Next.js para forçar uma reconstrução completa
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Diretórios para limpar
const dirsToClean = [
  '.next',
  'node_modules/.cache'
];

// Função para remover um diretório recursivamente
function removeDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`${colors.yellow}Diretório não encontrado: ${dir}${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}Removendo diretório: ${dir}${colors.reset}`);
  
  try {
    // No Windows, usar o comando rd para remover diretórios
    if (process.platform === 'win32') {
      execSync(`rd /s /q "${dir}"`, { stdio: 'inherit' });
    } else {
      // Em outros sistemas, usar rm -rf
      execSync(`rm -rf "${dir}"`, { stdio: 'inherit' });
    }
    console.log(`${colors.green}Diretório removido com sucesso: ${dir}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Erro ao remover diretório ${dir}:${colors.reset}`, error.message);
    
    // Tentar remover usando fs.rmSync se o comando falhar
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`${colors.green}Diretório removido com sucesso usando fs.rmSync: ${dir}${colors.reset}`);
    } catch (fsError) {
      console.error(`${colors.red}Erro ao remover diretório ${dir} usando fs.rmSync:${colors.reset}`, fsError.message);
    }
  }
}

// Função principal
function cleanNextCache() {
  console.log(`${colors.bright}${colors.blue}=== Limpando cache do Next.js ===${colors.reset}\n`);

  // Remover cada diretório
  dirsToClean.forEach(dir => {
    removeDir(dir);
  });

  console.log(`\n${colors.bright}${colors.green}=== Cache do Next.js limpo com sucesso! ===${colors.reset}`);
  console.log(`${colors.cyan}Agora você pode reconstruir o projeto com 'npm run build'${colors.reset}`);
}

// Executar a função principal
cleanNextCache();
