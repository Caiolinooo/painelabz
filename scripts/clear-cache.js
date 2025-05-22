/**
 * Script para limpar o cache do Next.js
 * Este script remove os diretórios de cache do Next.js para resolver problemas de MIME Type
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para saída no console
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

// Diretórios a serem limpos
const dirsToClean = [
  '.next/cache',
  '.next/server',
  '.next/static',
];

/**
 * Função para remover um diretório recursivamente
 */
function removeDir(dir) {
  if (fs.existsSync(dir)) {
    console.log(`${colors.yellow}Removendo ${dir}...${colors.reset}`);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`${colors.green}✓ Diretório ${dir} removido com sucesso.${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}✗ Erro ao remover ${dir}: ${error.message}${colors.reset}`);
    }
  } else {
    console.log(`${colors.dim}Diretório ${dir} não existe, pulando...${colors.reset}`);
  }
}

/**
 * Função principal para limpar o cache
 */
function clearCache() {
  console.log(`\n${colors.bright}${colors.blue}=== Limpando cache do Next.js ===${colors.reset}\n`);
  
  // Remover diretórios de cache
  dirsToClean.forEach(dir => {
    removeDir(path.resolve(dir));
  });
  
  console.log(`\n${colors.bright}${colors.green}=== Cache limpo com sucesso! ===${colors.reset}`);
  console.log(`\n${colors.yellow}Próximos passos:${colors.reset}`);
  console.log(`${colors.yellow}1. Execute 'npm run dev' para iniciar o servidor de desenvolvimento${colors.reset}`);
  console.log(`${colors.yellow}2. Se o problema persistir, tente 'npm run build' seguido de 'npm start'${colors.reset}`);
}

// Executar a função principal
clearCache();
