// Script para configurar o módulo de avaliação
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
  console.log(`\n${colors.bright}${colors.cyan}=== Configuração do Módulo de Avaliação ===${colors.reset}\n`);

  // Passo 1: Criar tabelas do módulo de avaliação
  if (!runCommand('node scripts/run-create-avaliacao-tables.js', 'Criar tabelas do módulo de avaliação')) {
    console.error(`${colors.red}Erro na criação das tabelas do módulo de avaliação. Abortando.${colors.reset}`);
    process.exit(1);
  }

  // Passo 2: Popular tabela de funcionários
  if (!runCommand('node scripts/populate-funcionarios.js', 'Popular tabela de funcionários')) {
    console.error(`${colors.red}Erro ao popular a tabela de funcionários. Abortando.${colors.reset}`);
    process.exit(1);
  }

  // Passo 3: Criar view para avaliações
  if (!runCommand('node scripts/create-avaliacao-view.js', 'Criar view para avaliações')) {
    console.log(`${colors.yellow}Aviso: Não foi possível criar a view para avaliações. O módulo ainda funcionará, mas com desempenho reduzido.${colors.reset}`);
  }

  console.log(`\n${colors.bright}${colors.green}=== Configuração do Módulo de Avaliação Concluída! ===${colors.reset}\n`);
}

// Executar a função principal
main().catch(error => {
  console.error(`${colors.red}Erro durante a configuração:${colors.reset}`, error);
  process.exit(1);
});
