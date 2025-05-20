/**
 * Script para configurar as tabelas e configurações de reembolso
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('=== Configuração de Reembolso ===');
console.log('Iniciando configuração das tabelas e configurações de reembolso...');

try {
  // Executar script para criar tabela settings
  console.log('\n1. Criando tabela settings...');
  execSync('node scripts/create-settings-table.js', { stdio: 'inherit' });
  
  console.log('\nConfiguração concluída com sucesso!');
  console.log('\nAgora você pode acessar a página de configurações de reembolso em:');
  console.log('- /admin/reimbursement-settings (para administradores)');
  console.log('- /reimbursement-settings?email=usuario@exemplo.com (para usuários específicos)');
} catch (error) {
  console.error('\nErro durante a configuração:', error);
  process.exit(1);
}
