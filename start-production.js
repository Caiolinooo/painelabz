/**
 * Script para iniciar o servidor em produção
 * 
 * Este script verifica se o PM2 está instalado e, se estiver, inicia o servidor usando o PM2.
 * Caso contrário, inicia o servidor diretamente usando o Node.js.
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Verificar se o PM2 está instalado
function isPM2Installed() {
  try {
    execSync('pm2 --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Verificar se o build foi feito
function isBuildReady() {
  const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');
  return fs.existsSync(standalonePath);
}

// Iniciar o servidor
function startServer() {
  console.log('Iniciando o servidor em modo de produção...');
  
  // Verificar se o build foi feito
  if (!isBuildReady()) {
    console.error('Erro: O build não foi encontrado. Execute "npm run build" primeiro.');
    process.exit(1);
  }
  
  // Definir variáveis de ambiente
  process.env.NODE_ENV = 'production';
  
  // Verificar se o PM2 está instalado
  const hasPM2 = isPM2Installed();
  
  if (hasPM2) {
    console.log('PM2 encontrado. Iniciando o servidor com PM2...');
    
    try {
      // Verificar se o processo já está rodando
      const pm2List = execSync('pm2 list').toString();
      
      if (pm2List.includes('painelabz')) {
        console.log('Reiniciando o processo existente...');
        execSync('pm2 restart painelabz');
      } else {
        console.log('Iniciando novo processo...');
        execSync('pm2 start .next/standalone/server.js --name painelabz');
      }
      
      console.log('Servidor iniciado com sucesso usando PM2.');
      console.log('Para visualizar os logs, execute: pm2 logs painelabz');
      console.log('Para parar o servidor, execute: pm2 stop painelabz');
    } catch (error) {
      console.error('Erro ao iniciar o servidor com PM2:', error.message);
      process.exit(1);
    }
  } else {
    console.log('PM2 não encontrado. Iniciando o servidor diretamente com Node.js...');
    
    try {
      // Iniciar o servidor diretamente
      const serverProcess = spawn('node', ['.next/standalone/server.js'], {
        stdio: 'inherit',
        detached: false
      });
      
      serverProcess.on('error', (error) => {
        console.error('Erro ao iniciar o servidor:', error.message);
        process.exit(1);
      });
      
      console.log('Servidor iniciado com sucesso. Pressione Ctrl+C para parar.');
    } catch (error) {
      console.error('Erro ao iniciar o servidor:', error.message);
      process.exit(1);
    }
  }
}

// Executar
startServer();
