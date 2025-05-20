// Script para executar todos os passos de configuração de segurança
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Função para executar um script
function runScript(scriptPath, description) {
  console.log(`\n=== ${description} ===`);
  try {
    execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    console.log(`✅ ${description} concluído com sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao executar ${description}:`, error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('Iniciando configuração de segurança...');
  
  // Lista de scripts para executar em ordem
  const scripts = [
    { path: 'scripts/backup-code.js', description: 'Backup do código atual' },
    { path: 'scripts/run-security-setup.js', description: 'Configuração de tabelas de segurança' },
    { path: 'scripts/migrate-credentials.js', description: 'Migração de credenciais' }
  ];
  
  // Executar cada script
  for (const script of scripts) {
    const success = runScript(script.path, script.description);
    
    if (!success) {
      console.error(`Erro ao executar ${script.description}. Abortando.`);
      process.exit(1);
    }
  }
  
  console.log('\n✅ Configuração de segurança concluída com sucesso!');
  console.log('\nPróximos passos:');
  console.log('1. Verifique se todas as tabelas foram criadas corretamente no Supabase');
  console.log('2. Verifique se as credenciais foram migradas para a tabela app_secrets');
  console.log('3. Teste o sistema para garantir que tudo está funcionando corretamente');
}

// Executar função principal
main()
  .then(() => {
    console.log('\nScript concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nErro durante a execução do script:', error);
    process.exit(1);
  });
