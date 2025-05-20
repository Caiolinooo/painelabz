/**
 * Script para reiniciar o servidor
 * Este script mata os processos nas portas 3000 e 3001, limpa o cache do Next.js e reinicia o servidor
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

console.log(`${colors.bright}${colors.blue}=== Reiniciando o servidor ===${colors.reset}\n`);

// Verificar se o sistema é Windows
const isWindows = os.platform() === 'win32';

// Matar processos nas portas 3000 e 3001
try {
  console.log(`${colors.cyan}Matando processos nas portas 3000 e 3001...${colors.reset}`);

  if (isWindows) {
    // No Windows, usar o comando netstat e taskkill
    try {
      // Encontrar processos usando as portas 3000 e 3001
      const netstatOutput = execSync('netstat -ano | findstr :3000 | findstr LISTENING').toString();
      const pidMatch = /\s+(\d+)$/.exec(netstatOutput);

      if (pidMatch && pidMatch[1]) {
        const pid = pidMatch[1];
        console.log(`${colors.yellow}Encontrado processo com PID ${pid} na porta 3000${colors.reset}`);
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
      }
    } catch (e) {
      // Ignorar erro se nenhum processo for encontrado
    }

    try {
      const netstatOutput = execSync('netstat -ano | findstr :3001 | findstr LISTENING').toString();
      const pidMatch = /\s+(\d+)$/.exec(netstatOutput);

      if (pidMatch && pidMatch[1]) {
        const pid = pidMatch[1];
        console.log(`${colors.yellow}Encontrado processo com PID ${pid} na porta 3001${colors.reset}`);
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'inherit' });
      }
    } catch (e) {
      // Ignorar erro se nenhum processo for encontrado
    }
  } else {
    // Em sistemas Unix, usar o comando lsof e kill
    try {
      execSync('npx kill-port 3000 3001', { stdio: 'inherit' });
    } catch (e) {
      // Tentar método alternativo
      try {
        const lsofOutput = execSync('lsof -i :3000,3001 -t').toString();
        const pids = lsofOutput.split('\n').filter(Boolean);

        if (pids.length > 0) {
          console.log(`${colors.yellow}Encontrados processos com PIDs: ${pids.join(', ')}${colors.reset}`);
          execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'inherit' });
        }
      } catch (lsofError) {
        // Ignorar erro se nenhum processo for encontrado
      }
    }
  }

  console.log(`${colors.green}Processos mortos com sucesso!${colors.reset}`);
} catch (error) {
  console.log(`${colors.yellow}Nenhum processo encontrado nas portas 3000 e 3001.${colors.reset}`);
}

// Limpar o cache do Next.js
try {
  console.log(`${colors.cyan}Limpando o cache do Next.js...${colors.reset}`);
  execSync('node scripts/clean-next-cache.js', { stdio: 'inherit' });
  console.log(`${colors.green}Cache limpo com sucesso!${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Erro ao limpar o cache:${colors.reset}`, error.message);
}

// Verificar se há atualizações de dependências
try {
  console.log(`${colors.cyan}Verificando atualizações de dependências...${colors.reset}`);
  execSync('npm install', { stdio: 'inherit' });
  console.log(`${colors.green}Dependências atualizadas com sucesso!${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}Erro ao atualizar dependências:${colors.reset}`, error.message);
}

// Iniciar o servidor
console.log(`\n${colors.bright}${colors.green}=== Iniciando o servidor ===${colors.reset}`);
try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error(`${colors.red}Erro ao iniciar o servidor:${colors.reset}`, error.message);
  console.log(`${colors.yellow}Tente iniciar o servidor manualmente com o comando "npm run dev".${colors.reset}`);
}

console.log(`\n${colors.bright}${colors.green}=== Servidor reiniciado com sucesso! ===${colors.reset}`);
console.log(`${colors.cyan}Acesse http://localhost:3000 para verificar a interface do usuário.${colors.reset}`);
