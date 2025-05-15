// Script para executar todos os passos de consolidação das tabelas
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Função para executar um comando
function runCommand(command, description) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${description} ===${colors.reset}\n`);
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`\n${colors.green}✓ ${description} concluído com sucesso!${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`\n${colors.red}✗ Erro ao ${description.toLowerCase()}:${colors.reset}`, error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}=== Consolidação de Todas as Tabelas ===${colors.reset}\n`);

  // Passo 1: Consolidar tabelas de usuários
  if (!runCommand('node scripts/run-consolidate-user-tables.js', 'Consolidar tabelas de usuários')) {
    console.error(`${colors.red}Erro na consolidação das tabelas de usuários. Abortando.${colors.reset}`);
    process.exit(1);
  }

  // Passo 2: Criar tabelas do módulo de avaliação
  if (!runCommand('node scripts/run-create-avaliacao-tables.js', 'Criar tabelas do módulo de avaliação')) {
    console.error(`${colors.red}Erro na criação das tabelas do módulo de avaliação. Abortando.${colors.reset}`);
    process.exit(1);
  }

  // Passo 3: Popular tabela de funcionários
  if (!runCommand('node scripts/populate-funcionarios.js', 'Popular tabela de funcionários')) {
    console.error(`${colors.red}Erro ao popular a tabela de funcionários. Abortando.${colors.reset}`);
    process.exit(1);
  }

  console.log(`\n${colors.bright}${colors.green}=== Consolidação de Todas as Tabelas Concluída! ===${colors.reset}\n`);
}

// Executar a função principal
main().catch(error => {
  console.error(`${colors.red}Erro durante a consolidação:${colors.reset}`, error);
  process.exit(1);
});
