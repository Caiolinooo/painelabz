/**
 * Script para executar todas as correções do módulo de avaliação
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Função para executar comandos
function runCommand(command) {
  try {
    console.log(`Executando: ${command}`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    return output;
  } catch (error) {
    console.error(`Erro ao executar comando: ${command}`);
    console.error(error.message);
    return null;
  }
}

// Função principal
async function fixAvaliacaoAll() {
  try {
    console.log('Iniciando correção completa do módulo de avaliação...');
    
    // Verificar variáveis de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Variáveis de ambiente do Supabase não definidas');
      console.error('Certifique-se de definir NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    
    // Executar correção do banco de dados
    console.log('Executando correção do banco de dados...');
    runCommand('node scripts/run-database-fix.js');
    
    // Executar teste da API
    console.log('Executando teste da API...');
    runCommand('node scripts/test-avaliacao-api.js');
    
    // Reiniciar o servidor de desenvolvimento
    console.log('Reiniciando o servidor de desenvolvimento...');
    
    // Verificar se há um servidor em execução e matá-lo
    try {
      runCommand('npx kill-port 3000 3001');
    } catch (error) {
      console.log('Nenhum servidor em execução nas portas 3000 e 3001');
    }
    
    // Iniciar o servidor em segundo plano
    console.log('Iniciando o servidor de desenvolvimento...');
    const serverProcess = require('child_process').spawn('npx', ['next', 'dev'], {
      detached: true,
      stdio: 'ignore'
    });
    
    // Desvincula o processo para que ele continue em execução mesmo após o término deste script
    serverProcess.unref();
    
    console.log('Servidor de desenvolvimento iniciado em segundo plano');
    console.log('Correção completa do módulo de avaliação concluída com sucesso!');
    console.log('Acesse http://localhost:3000/avaliacao para verificar se o módulo está funcionando corretamente');
  } catch (err) {
    console.error('Erro ao executar correção completa do módulo de avaliação:', err);
  }
}

// Executar o script
fixAvaliacaoAll();
