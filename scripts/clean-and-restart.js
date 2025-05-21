/**
 * Script para limpar o cache do Next.js e reiniciar o servidor de desenvolvimento
 * Isso pode ajudar a resolver problemas de compilação e avisos de useLayoutEffect
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');

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

// Diretórios para limpar
const dirsToClean = [
  '.next',
  'node_modules/.cache',
];

// Função para limpar um diretório
function cleanDirectory(dir) {
  try {
    const fullPath = path.resolve(dir);

    if (fs.existsSync(fullPath)) {
      console.log(`${colors.yellow}Limpando diretório: ${fullPath}${colors.reset}`);
      rimraf.sync(fullPath);
      console.log(`${colors.green}Diretório limpo com sucesso: ${fullPath}${colors.reset}`);
    } else {
      console.log(`${colors.dim}Diretório não encontrado: ${fullPath}${colors.reset}`);
    }

    return true;
  } catch (error) {
    console.error(`${colors.red}Erro ao limpar diretório ${dir}:${colors.reset}`, error.message);
    return false;
  }
}

// Função para executar um comando
function runCommand(command, description) {
  try {
    console.log(`${colors.cyan}${description}...${colors.reset}`);
    execSync(command, { stdio: 'inherit' });
    console.log(`${colors.green}${description} concluído com sucesso!${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}Erro ao ${description.toLowerCase()}:${colors.reset}`, error.message);
    return false;
  }
}

// Função principal
function cleanAndRestart() {
  console.log(`${colors.bright}${colors.blue}=== Limpando cache e reiniciando servidor ===${colors.reset}\n`);

  // Pular a etapa de parar o servidor Next.js
  console.log(`${colors.yellow}Pulando a etapa de parar o servidor Next.js...${colors.reset}`);
  console.log(`${colors.yellow}Recomendação: Pare manualmente o servidor antes de continuar.${colors.reset}`);

  // Limpar diretórios de cache
  for (const dir of dirsToClean) {
    cleanDirectory(dir);
  }

  // Instalar dependências
  runCommand('npm install', 'Instalando dependências');

  // Não iniciar o servidor Next.js automaticamente
  console.log(`${colors.yellow}Não iniciando o servidor Next.js automaticamente.${colors.reset}`);
  console.log(`${colors.yellow}Execute 'npm run dev' manualmente após a conclusão deste script.${colors.reset}`);

  console.log(`\n${colors.bright}${colors.green}=== Processo concluído! ===${colors.reset}`);
}

// Executar a função principal
cleanAndRestart();
