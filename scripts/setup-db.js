/**
 * Script para configurar o banco de dados
 * 
 * Este script executa os seguintes passos:
 * 1. Executa as migrações do Prisma
 * 2. Gera o cliente Prisma
 * 3. Executa o seed para popular o banco de dados com dados iniciais
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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
  console.log(`${colors.bright}${colors.cyan}> ${description}...${colors.reset}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`${colors.green}✓ ${description} concluído com sucesso!${colors.reset}\n`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Erro ao ${description.toLowerCase()}:${colors.reset}`, error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}=== Configuração do Banco de Dados ===${colors.reset}\n`);

  // Verificar se o arquivo .env existe
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error(`${colors.red}✗ Arquivo .env não encontrado. Por favor, crie o arquivo .env com a configuração do banco de dados.${colors.reset}`);
    process.exit(1);
  }

  // Executar as migrações do Prisma
  if (!runCommand('npx prisma migrate dev', 'Executar migrações do Prisma')) {
    process.exit(1);
  }

  // Gerar o cliente Prisma
  if (!runCommand('npx prisma generate', 'Gerar cliente Prisma')) {
    process.exit(1);
  }

  // Executar o seed
  if (!runCommand('npx ts-node prisma/seed.ts', 'Popular banco de dados com dados iniciais')) {
    process.exit(1);
  }

  console.log(`\n${colors.bright}${colors.green}=== Configuração do Banco de Dados Concluída! ===${colors.reset}\n`);
  console.log(`${colors.yellow}Agora você pode iniciar o servidor com:${colors.reset}`);
  console.log(`${colors.cyan}npm run dev${colors.reset}\n`);
}

main().catch(error => {
  console.error(`${colors.red}Erro durante a configuração:${colors.reset}`, error);
  process.exit(1);
});
