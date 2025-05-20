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
  '.next/cache',
  '.next/cache/webpack',
  'node_modules/.cache',
  'node_modules/.cache/webpack',
  '.vercel/output',  // Vercel build output
  '.netlify',        // Netlify build cache
];

// Função para remover um diretório recursivamente
function removeDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`${colors.yellow}Diretório não encontrado: ${dir}${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}Removendo diretório: ${dir}${colors.reset}`);

  // Primeiro, tente remover arquivos individuais para evitar problemas de permissão
  try {
    // Remover arquivos individuais primeiro
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          if (fs.statSync(filePath).isDirectory()) {
            // Recursivamente remover subdiretórios
            removeDir(filePath);
          } else {
            // Remover arquivo
            fs.unlinkSync(filePath);
            console.log(`${colors.green}Arquivo removido: ${filePath}${colors.reset}`);
          }
        } catch (fileError) {
          console.error(`${colors.red}Erro ao remover arquivo ${filePath}:${colors.reset}`, fileError.message);
        }
      }
    }
  } catch (readError) {
    console.error(`${colors.red}Erro ao ler diretório ${dir}:${colors.reset}`, readError.message);
  }

  // Agora tente remover o diretório
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

      // Última tentativa: remover o diretório vazio
      try {
        fs.rmdirSync(dir);
        console.log(`${colors.green}Diretório vazio removido: ${dir}${colors.reset}`);
      } catch (rmdirError) {
        console.error(`${colors.red}Não foi possível remover o diretório ${dir}:${colors.reset}`, rmdirError.message);
        console.log(`${colors.yellow}Tente fechar todos os processos do Node.js e executar novamente${colors.reset}`);
      }
    }
  }
}

// Função para limpar os arquivos de cache do webpack
function cleanWebpackCache() {
  console.log(`${colors.cyan}Procurando arquivos de cache do webpack...${colors.reset}`);

  const webpackCachePattern = /\.webpack\.cache/;
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');

  if (fs.existsSync(nodeModulesPath)) {
    try {
      const files = fs.readdirSync(nodeModulesPath);
      files.forEach(file => {
        if (webpackCachePattern.test(file)) {
          const cachePath = path.join(nodeModulesPath, file);
          console.log(`${colors.yellow}Encontrado cache do webpack: ${cachePath}${colors.reset}`);
          removeDir(cachePath);
        }
      });
    } catch (error) {
      console.error(`${colors.red}Erro ao procurar arquivos de cache do webpack:${colors.reset}`, error.message);
    }
  }
}

// Função para limpar o cache do npm
function cleanNpmCache() {
  console.log(`${colors.cyan}Limpando cache do npm...${colors.reset}`);

  try {
    execSync('npm cache clean --force', { stdio: 'inherit' });
    console.log(`${colors.green}Cache do npm limpo com sucesso!${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Erro ao limpar cache do npm:${colors.reset}`, error.message);
  }
}

// Função principal
function cleanNextCache() {
  console.log(`${colors.bright}${colors.blue}=== Limpando cache do Next.js ===${colors.reset}\n`);

  // Remover cada diretório
  dirsToClean.forEach(dir => {
    removeDir(dir);
  });

  // Limpar cache do webpack
  cleanWebpackCache();

  // Perguntar se deseja limpar o cache do npm também
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question(`${colors.yellow}Deseja limpar o cache do npm também? (s/N): ${colors.reset}`, answer => {
    if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      cleanNpmCache();
    }

    console.log(`\n${colors.bright}${colors.green}=== Cache do Next.js limpo com sucesso! ===${colors.reset}`);
    console.log(`${colors.cyan}Agora você pode reconstruir o projeto com 'npm run build'${colors.reset}`);

    readline.close();
  });
}

// Executar a função principal
cleanNextCache();
