// Script para executar todas as correções
const { execSync } = require('child_process');
const path = require('path');

console.log('Iniciando correção do sistema...');

// Executar script para criar a tabela authorized_users
console.log('\n1. Criando tabela authorized_users...');
try {
  execSync('node scripts/run-supabase-sql.js scripts/create-authorized-users-table.sql', { stdio: 'inherit' });
  console.log('Tabela authorized_users criada com sucesso!');
} catch (error) {
  console.error('Erro ao criar tabela authorized_users:', error.message);
}

// Executar script para corrigir o usuário administrador
console.log('\n2. Corrigindo usuário administrador...');
try {
  execSync('node scripts/fix-admin-user.js', { stdio: 'inherit' });
  console.log('Usuário administrador corrigido com sucesso!');
} catch (error) {
  console.error('Erro ao corrigir usuário administrador:', error.message);
}

console.log('\nCorreção do sistema concluída!');
console.log('Agora você pode acessar a página de admin-fix para verificar se tudo está funcionando corretamente.');
console.log('URL: http://localhost:3000/admin-fix');
