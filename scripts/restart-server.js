// Script para reiniciar o servidor
const { execSync } = require('child_process');
const path = require('path');

console.log('Reiniciando o servidor...');

// Matar processos nas portas 3000 e 3001
try {
  console.log('Matando processos nas portas 3000 e 3001...');
  execSync('npx kill-port 3000 3001', { stdio: 'inherit' });
  console.log('Processos mortos com sucesso!');
} catch (error) {
  console.log('Nenhum processo encontrado nas portas 3000 e 3001.');
}

// Limpar o cache do Next.js
try {
  console.log('Limpando o cache do Next.js...');
  execSync('npm run clean', { stdio: 'inherit' });
  console.log('Cache limpo com sucesso!');
} catch (error) {
  console.error('Erro ao limpar o cache:', error.message);
}

// Iniciar o servidor
console.log('Iniciando o servidor...');
try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('Erro ao iniciar o servidor:', error.message);
  console.log('Tente iniciar o servidor manualmente com o comando "npm run dev".');
}

console.log('Servidor reiniciado com sucesso!');
console.log('Acesse http://localhost:3000/avaliacao para verificar a interface do usuário.');
