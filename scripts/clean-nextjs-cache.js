// Script para limpar o cache do Next.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Função para limpar o cache do Next.js
function cleanNextJsCache() {
  console.log('Limpando o cache do Next.js...');

  // Diretórios a serem limpos
  const dirsToClean = [
    '.next',
    'node_modules/.cache'
  ];

  // Limpar cada diretório
  dirsToClean.forEach(dir => {
    const dirPath = path.resolve(dir);
    
    if (fs.existsSync(dirPath)) {
      console.log(`Removendo ${dir}...`);
      
      try {
        if (process.platform === 'win32') {
          // No Windows, usar o comando rd para remover diretórios
          execSync(`rd /s /q "${dirPath}"`, { stdio: 'inherit' });
        } else {
          // No Linux/Mac, usar o comando rm
          execSync(`rm -rf "${dirPath}"`, { stdio: 'inherit' });
        }
        
        console.log(`${dir} removido com sucesso.`);
      } catch (error) {
        console.error(`Erro ao remover ${dir}:`, error.message);
      }
    } else {
      console.log(`${dir} não existe, pulando.`);
    }
  });

  console.log('Limpeza do cache concluída.');
}

// Executar a limpeza
cleanNextJsCache();
